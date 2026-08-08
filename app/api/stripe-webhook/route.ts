import { NextResponse } from "next/server";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function metadataArray<T extends string | number>(value: string | undefined, type: "string" | "number"): T[] {
  try {
    const parsed = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => type === "number" ? Number(item) : String(item))
      .filter((item) => type === "number" ? Number.isFinite(item) : Boolean(item)) as T[];
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || stripeKey.length < 30 || !webhookSecret || webhookSecret.length < 20) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = new Stripe(stripeKey).webhooks.constructEvent(await req.text(), signature, webhookSecret);
  } catch (error) {
    console.error("Stripe signature verification failed:", error);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const metadata = session.metadata ?? {};
  const supabase = getSupabaseAdmin();
  const orderId = `SR-${session.id.slice(-12).toUpperCase()}`;
  const itemIds = metadataArray<string>(metadata.item_ids, "string");
  const itemNames = metadataArray<string>(metadata.item_names, "string");
  const itemBrands = metadataArray<string>(metadata.item_brands, "string");
  const itemPrices = metadataArray<number>(metadata.item_prices, "number");
  const itemPrice = itemPrices.length ? itemPrices.reduce((sum, price) => sum + price, 0) : Number(metadata.item_price ?? 0);
  const postage = Number(metadata.postage ?? 0);
  const total = Number(session.amount_total ?? Math.round((itemPrice + postage) * 100)) / 100;

  const { data: existing } = await supabase
    .from("orders")
    .select("*")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  let order = existing;
  if (!order) {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        id: orderId,
        stripe_session_id: session.id,
        source: "stripe",
        item_id: itemIds.join(",") || metadata.item_id || "",
        item_name: itemNames.join(" | ") || metadata.item_name || "Vintage item",
        brand: [...new Set(itemBrands)].join(", ") || metadata.item_brand || "",
        price: itemPrice,
        postage,
        total,
        customer_name: metadata.customer_name ?? session.customer_details?.name ?? "",
        customer_email: session.customer_details?.email ?? session.customer_email ?? "",
        customer_phone: metadata.customer_phone ?? session.customer_details?.phone ?? "",
        customer_address: metadata.customer_address ?? "",
        payment_status: "paid",
        date_of_sale: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) {
      console.error("Supabase order insert failed:", error);
      return NextResponse.json({ error: "Could not save order" }, { status: 500 });
    }
    order = data;

    const databaseItemIds = (itemIds.length ? itemIds : [metadata.item_id ?? ""])
      .filter((id) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id));
    if (databaseItemIds.length) {
      const { error: stockError } = await supabase
        .from("products")
        .update({ stock: 0, updated_at: new Date().toISOString() })
        .in("id", databaseItemIds);
      if (stockError) console.error("Product stock update failed:", stockError);
    }
  }

  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const gmailUser = process.env.GMAIL_USER ?? "stackedracksvintage@gmail.com";
  const ownerEmail = process.env.OWNER_EMAIL ?? gmailUser;
  if (!gmailPass || gmailPass.length < 12) {
    console.error("Gmail SMTP is not configured");
    return NextResponse.json({ received: true, emailConfigured: false });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: gmailUser, pass: gmailPass },
  });

  const customerName = escapeHtml(order.customer_name);
  const customerEmail = String(order.customer_email ?? "");
  const address = escapeHtml(order.customer_address);
  const emailItems = (itemNames.length ? itemNames : [String(order.item_name ?? "Vintage item")])
    .map((name, index) => ({
      name: escapeHtml(name),
      brand: escapeHtml(itemBrands[index] ?? (itemNames.length ? "" : order.brand)),
      price: Number(itemPrices[index] ?? (itemNames.length ? 0 : itemPrice)),
    }));
  const itemListHtml = emailItems.map((item) =>
    `<div style="padding:10px 0;border-bottom:1px solid #222"><strong>${item.name}</strong>${item.brand ? `<br><span style="color:#aaa">${item.brand}</span>` : ""}${item.price ? `<span style="float:right">£${item.price.toFixed(2)}</span>` : ""}</div>`,
  ).join("");
  const subjectItem = emailItems.length > 1 ? `${emailItems.length} vintage items` : String(order.item_name);
  let emailFailed = false;

  if (customerEmail && !order.customer_email_sent) {
    try {
      await transporter.sendMail({
        from: `"Stacked Racks Vintage" <${gmailUser}>`,
        to: customerEmail,
        subject: `Order confirmed — ${subjectItem}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#0a0a0a;color:#fff;padding:32px">
          <h1 style="color:#E8500A">Order confirmed</h1><p>Thanks ${customerName}, your payment was successful.</p>
          <div style="background:#111;border:1px solid #222;padding:20px;margin:20px 0">${itemListHtml}
          <p>Items £${itemPrice.toFixed(2)} · Postage £${postage.toFixed(2)} · <strong>Total £${total.toFixed(2)}</strong></p></div>
          <p style="white-space:pre-line;color:#aaa">Shipping to:<br>${address}</p><p>We aim to dispatch within 24–48 hours.</p>
          <p style="color:#555;font-size:12px">Order ${escapeHtml(order.id)}</p></div>`,
      });
      await supabase.from("orders").update({ customer_email_sent: true }).eq("id", order.id);
    } catch (error) {
      emailFailed = true;
      console.error("Customer email failed:", error);
    }
  }

  if (!order.owner_email_sent) {
    try {
      await transporter.sendMail({
        from: `"Stacked Racks Vintage" <${gmailUser}>`,
        to: ownerEmail,
        subject: `New sale — ${subjectItem} · £${total.toFixed(2)}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#0a0a0a;color:#fff;padding:32px">
          <h1 style="color:#E8500A">New paid order</h1>${itemListHtml}
          <p>Items £${itemPrice.toFixed(2)} · Postage £${postage.toFixed(2)} · <strong>Total £${total.toFixed(2)}</strong></p>
          <p><strong>Customer:</strong> ${customerName}<br><strong>Email:</strong> ${escapeHtml(customerEmail)}<br><strong>Phone:</strong> ${escapeHtml(order.customer_phone)}</p>
          <p style="white-space:pre-line"><strong>Address:</strong><br>${address}</p><p>Order ${escapeHtml(order.id)}</p></div>`,
      });
      await supabase.from("orders").update({ owner_email_sent: true }).eq("id", order.id);
    } catch (error) {
      emailFailed = true;
      console.error("Owner email failed:", error);
    }
  }

  if (emailFailed) return NextResponse.json({ error: "Order saved; email delivery will retry" }, { status: 500 });
  return NextResponse.json({ received: true });
}

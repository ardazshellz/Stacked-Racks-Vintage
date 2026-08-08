import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

// Raw body needed for Stripe signature verification
export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey);
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${err}` }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const m = session.metadata ?? {};

  const orderId = `SR-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();
  const itemPrice = parseFloat(m.item_price ?? "0");
  const postage = parseFloat(m.postage ?? "3.99");
  const total = itemPrice + postage;

  // ── Save to Supabase ──
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.from("orders").insert({
      id: orderId,
      stripe_session_id: session.id,
      item_name: m.item_name,
      brand: m.item_brand,
      price: itemPrice,
      postage,
      total,
      customer_name: m.customer_name,
      customer_email: session.customer_email,
      customer_phone: m.customer_phone,
      customer_address: m.customer_address,
      payment_status: "paid",
      date_of_sale: now,
    });
  } catch (err) {
    console.error("Supabase insert error:", err);
  }

  // ── Send emails ──
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailPass) {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: "stackedracksvintage@gmail.com", pass: gmailPass },
    });

    // Customer confirmation
    await transporter.sendMail({
      from: '"Stacked Racks Vintage" <stackedracksvintage@gmail.com>',
      to: session.customer_email!,
      subject: `Order Confirmed — ${m.item_name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;">
          <h1 style="color:#E8500A;font-size:22px;margin-bottom:4px;">Order Confirmed</h1>
          <p style="color:#aaa;font-size:13px;margin-bottom:24px;">Stacked Racks Vintage · London</p>
          <div style="background:#111;border:1px solid #222;padding:20px;margin-bottom:20px;">
            <p style="color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">Your Order</p>
            <p style="font-size:16px;font-weight:bold;margin-bottom:4px;">${m.item_name}</p>
            <p style="color:#aaa;font-size:13px;margin-bottom:16px;">${m.item_brand} · Stacked Racks Vintage</p>
            <table style="width:100%;font-size:13px;color:#aaa;">
              <tr><td>Item</td><td style="text-align:right;color:#fff;">£${itemPrice.toFixed(2)}</td></tr>
              <tr><td>Postage</td><td style="text-align:right;color:#fff;">£${postage.toFixed(2)}</td></tr>
              <tr style="border-top:1px solid #222;"><td style="padding-top:10px;color:#fff;font-weight:bold;">Total</td><td style="text-align:right;padding-top:10px;color:#E8500A;font-weight:bold;">£${total.toFixed(2)}</td></tr>
            </table>
          </div>
          <div style="background:#111;border:1px solid #222;padding:20px;margin-bottom:20px;">
            <p style="color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Shipping To</p>
            <p style="font-size:13px;color:#aaa;white-space:pre-line;">${m.customer_address}</p>
          </div>
          <p style="color:#aaa;font-size:13px;line-height:1.6;">
            We'll dispatch your order within 24–48 hours via Royal Mail. You'll receive tracking information once it's on its way.
          </p>
          <p style="color:#aaa;font-size:13px;margin-top:16px;">Questions? DM us on <a href="https://instagram.com/stacked_racks_vintage" style="color:#E8500A;">Instagram</a></p>
          <p style="color:#333;font-size:11px;margin-top:32px;">Order ID: ${orderId} · © 2026 Stacked Racks Vintage Ltd</p>
        </div>
      `,
    });

    // Owner notification
    await transporter.sendMail({
      from: '"Stacked Racks Vintage" <stackedracksvintage@gmail.com>',
      to: "stackedracksvintage@gmail.com",
      subject: `🛍 New Sale — ${m.item_name} · £${total.toFixed(2)}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;">
          <h1 style="color:#E8500A;font-size:20px;">New Order</h1>
          <table style="width:100%;font-size:13px;color:#aaa;margin-top:16px;line-height:2;">
            <tr><td><strong style="color:#fff;">Order ID</strong></td><td>${orderId}</td></tr>
            <tr><td><strong style="color:#fff;">Item</strong></td><td>${m.item_name}</td></tr>
            <tr><td><strong style="color:#fff;">Brand</strong></td><td>${m.item_brand}</td></tr>
            <tr><td><strong style="color:#fff;">Sale Price</strong></td><td>£${itemPrice.toFixed(2)}</td></tr>
            <tr><td><strong style="color:#fff;">Postage</strong></td><td>£${postage.toFixed(2)}</td></tr>
            <tr><td><strong style="color:#fff;">Total Received</strong></td><td style="color:#E8500A;font-weight:bold;">£${total.toFixed(2)}</td></tr>
            <tr><td><strong style="color:#fff;">Customer</strong></td><td>${m.customer_name}</td></tr>
            <tr><td><strong style="color:#fff;">Email</strong></td><td>${session.customer_email}</td></tr>
            <tr><td><strong style="color:#fff;">Phone</strong></td><td>${m.customer_phone}</td></tr>
            <tr><td><strong style="color:#fff;">Ship To</strong></td><td style="white-space:pre-line;">${m.customer_address}</td></tr>
          </table>
        </div>
      `,
    });
  }

  return NextResponse.json({ received: true });
}

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import type { Product } from "@/lib/products";
import { rowToProduct, type ProductRow } from "@/lib/product-db";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { getProductSettings } from "@/lib/server/product-settings";
import { calculatePostage } from "@/lib/shipping";
import { sameOrigin, withinRateLimit } from "@/lib/server/request-security";

const MAX_ITEMS = 8;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  if (!(await withinRateLimit(req, "checkout", 20, 60 * 60))) {
    return NextResponse.json({ error: "Too many checkout attempts. Please try again later." }, { status: 429 });
  }
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || stripeKey.length < 30) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  const stripe = new Stripe(stripeKey);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const { itemIds, itemId, name, email, phone, address, promotionCode } = await req.json();
  const requestedIds = [...new Set((Array.isArray(itemIds) ? itemIds : itemId ? [itemId] : []).map(String))].slice(0, MAX_ITEMS);

  if (!requestedIds.length || !name || !email || !phone || !address) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const safeName = String(name).trim().slice(0, 120);
  const safeEmail = String(email).trim().toLowerCase().slice(0, 254);
  const safePhone = String(phone).trim().slice(0, 50);
  const safeAddress = String(address).trim().slice(0, 500);
  if (!safeEmail.includes("@") || safeName.length < 2 || safeAddress.length < 8) {
    return NextResponse.json({ error: "Please check your customer details" }, { status: 400 });
  }

  let reservationToken = "";
  try {
    const settings = await getProductSettings();
    const unavailable = new Set([...settings.hiddenProductIds, ...settings.deletedProductIds]);
    if (requestedIds.some((id) => unavailable.has(id))) {
      return NextResponse.json({ error: "One of these items is no longer available" }, { status: 409 });
    }

    const dynamicIds = requestedIds.filter((id) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id));
    if (dynamicIds.length !== requestedIds.length) {
      return NextResponse.json({ error: "One of these items is no longer available" }, { status: 409 });
    }

    const supabase = getSupabaseAdmin();
    reservationToken = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const { data: reservedRows, error: reservationError } = await supabase.rpc("reserve_products", {
      p_ids: dynamicIds,
      p_token: reservationToken,
      p_expires_at: expiresAt.toISOString(),
    });
    if (reservationError || !Array.isArray(reservedRows) || reservedRows.length !== requestedIds.length) {
      return NextResponse.json({ error: "One of these items is being purchased by another customer" }, { status: 409 });
    }
    const products = (reservedRows as ProductRow[]).map(rowToProduct) as Product[];

    const originalSubtotal = products.reduce((sum, product) => sum + product.price, 0);
    const normalizedPromotion = String(promotionCode ?? "").trim().toUpperCase();
    let discountApplied = normalizedPromotion === "VINTAGE10";
    if (normalizedPromotion && !discountApplied) {
      const { data: subscriber } = await supabase
        .from("subscribers")
        .select("discount_code,unsubscribed_at,discount_redeemed_at")
        .eq("discount_code", normalizedPromotion)
        .maybeSingle();
      discountApplied = Boolean(subscriber && !subscriber.unsubscribed_at && !subscriber.discount_redeemed_at);
    }
    const itemPrices = products.map((product) => Number((product.price * (discountApplied ? 0.9 : 1)).toFixed(2)));
    const subtotal = itemPrices.reduce((sum, price) => sum + price, 0);
    const postage = calculatePostage(originalSubtotal);
    const postagePence = Math.round(postage * 100);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        ...products.map((product, index) => ({
          price_data: {
            currency: "gbp",
            product_data: {
              name: product.name,
              description: `${product.brand} · Stacked Racks Vintage`,
              images: product.imageUrls?.slice(0, 1),
            },
            unit_amount: Math.round(itemPrices[index] * 100),
          },
          quantity: 1,
        })),
        ...(postagePence > 0 ? [{
          price_data: { currency: "gbp", product_data: { name: "UK Postage (Royal Mail)" }, unit_amount: postagePence },
          quantity: 1,
        }] : []),
      ],
      mode: "payment",
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      customer_email: safeEmail,
      client_reference_id: String(products[0].id),
      metadata: {
        item_ids: JSON.stringify(products.map((product) => String(product.id))),
        item_names: JSON.stringify(products.map((product) => product.name.slice(0, 45))),
        item_brands: JSON.stringify(products.map((product) => product.brand.slice(0, 24))),
        item_prices: JSON.stringify(itemPrices),
        item_id: products.map((product) => String(product.id)).join(",").slice(0, 500),
        item_name: products.map((product) => product.name).join(" | ").slice(0, 500),
        item_brand: [...new Set(products.map((product) => product.brand))].join(", ").slice(0, 500),
        item_price: String(subtotal),
        discount_code: discountApplied ? normalizedPromotion : "",
        discount_amount: discountApplied ? String(Number((originalSubtotal - subtotal).toFixed(2))) : "0",
        item_count: String(products.length),
        postage: String(postage),
        customer_name: safeName,
        customer_phone: safePhone,
        customer_address: safeAddress,
        reservation_token: reservationToken,
      },
      success_url: `${base}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?order=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout Session error:", error);
    if (reservationToken) {
      try {
        await getSupabaseAdmin().rpc("release_product_reservation", { p_token: reservationToken });
      } catch {
        // The reservation expires automatically even if immediate release fails.
      }
    }
    return NextResponse.json({ error: "Payments are temporarily unavailable" }, { status: 503 });
  }
}

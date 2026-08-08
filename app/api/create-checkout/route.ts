import { NextResponse } from "next/server";
import Stripe from "stripe";
import { products as staticProducts, type Product } from "@/lib/products";
import { rowToProduct, type ProductRow } from "@/lib/product-db";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const POSTAGE_PENCE = 399;

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || stripeKey.length < 30) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const { itemId, name, email, phone, address } = await req.json();

  if (!itemId || !name || !email || !phone || !address) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const safeName = String(name).trim().slice(0, 120);
  const safeEmail = String(email).trim().toLowerCase().slice(0, 254);
  const safePhone = String(phone).trim().slice(0, 50);
  const safeAddress = String(address).trim().slice(0, 500);
  if (!safeEmail.includes("@") || safeName.length < 2 || safeAddress.length < 8) {
    return NextResponse.json({ error: "Please check your customer details" }, { status: 400 });
  }

  let product: Product | undefined = staticProducts.find((item) => String(item.id) === String(itemId));
  if (!product) {
    try {
      const { data, error } = await getSupabaseAdmin().from("products").select("*").eq("id", String(itemId)).single();
      if (!error && data) product = rowToProduct(data as ProductRow);
    } catch {
      // The generic not-found response below avoids leaking database details.
    }
  }
  if (!product || product.stock < 1) {
    return NextResponse.json({ error: "This item is no longer available" }, { status: 409 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "gbp",
          product_data: {
            name: product.name,
            description: `${product.brand} · Stacked Racks Vintage`,
            images: product.imageUrls?.slice(0, 1),
          },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "gbp",
          product_data: { name: "UK Postage (Royal Mail)" },
          unit_amount: POSTAGE_PENCE,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    customer_email: safeEmail,
    client_reference_id: String(product.id),
    metadata: {
      item_id: String(product.id),
      item_name: product.name.slice(0, 500),
      item_brand: product.brand.slice(0, 500),
      item_price: String(product.price),
      postage: String(POSTAGE_PENCE / 100),
      customer_name: safeName,
      customer_phone: safePhone,
      customer_address: safeAddress,
    },
    success_url: `${base}/?order=success`,
    cancel_url: `${base}/?order=cancelled`,
  });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout Session error:", error);
    return NextResponse.json({ error: "Payments are temporarily unavailable" }, { status: 503 });
  }
}

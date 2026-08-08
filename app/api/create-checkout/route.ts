import { NextResponse } from "next/server";
import Stripe from "stripe";
import { products as staticProducts, type Product } from "@/lib/products";
import { rowToProduct, type ProductRow } from "@/lib/product-db";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { getProductSettings } from "@/lib/server/product-settings";

const POSTAGE_PENCE = 399;
const MAX_ITEMS = 8;

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || stripeKey.length < 30) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  const stripe = new Stripe(stripeKey);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const { itemIds, itemId, name, email, phone, address } = await req.json();
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

  try {
    const settings = await getProductSettings();
    const unavailable = new Set([...settings.hiddenProductIds, ...settings.deletedProductIds]);
    if (requestedIds.some((id) => unavailable.has(id))) {
      return NextResponse.json({ error: "One of these items is no longer available" }, { status: 409 });
    }

    const dynamicIds = requestedIds.filter((id) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id));
    let databaseProducts: Product[] = [];
    if (dynamicIds.length) {
      const { data, error } = await getSupabaseAdmin().from("products").select("*").in("id", dynamicIds);
      if (error) throw error;
      databaseProducts = (data as ProductRow[]).map(rowToProduct);
    }

    const allProducts = [...databaseProducts, ...staticProducts];
    const productMap = new Map(allProducts.map((product) => [String(product.id), product]));
    const products = requestedIds.map((id) => productMap.get(id)).filter((product): product is Product => Boolean(product));
    if (products.length !== requestedIds.length || products.some((product) => product.stock < 1)) {
      return NextResponse.json({ error: "One of these items is no longer available" }, { status: 409 });
    }

    const itemPrices = products.map((product) => product.price);
    const subtotal = itemPrices.reduce((sum, price) => sum + price, 0);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        ...products.map((product) => ({
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
        })),
        {
          price_data: { currency: "gbp", product_data: { name: "UK Postage (Royal Mail)" }, unit_amount: POSTAGE_PENCE },
          quantity: 1,
        },
      ],
      mode: "payment",
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
        item_count: String(products.length),
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

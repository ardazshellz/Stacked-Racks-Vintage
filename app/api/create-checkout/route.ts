import { NextResponse } from "next/server";
import Stripe from "stripe";

const POSTAGE_PENCE = 399;

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const { itemId, itemName, itemBrand, itemPrice, name, email, phone, address } = await req.json();

  if (!itemName || !itemPrice || !name || !email || !phone || !address) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "gbp",
          product_data: {
            name: itemName,
            description: `${itemBrand ?? ""} · Stacked Racks Vintage`.trim(),
          },
          unit_amount: Math.round(itemPrice * 100),
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
    customer_email: email,
    metadata: {
      item_id: String(itemId ?? ""),
      item_name: itemName,
      item_brand: itemBrand ?? "",
      item_price: String(itemPrice),
      postage: String(POSTAGE_PENCE / 100),
      customer_name: name,
      customer_phone: phone,
      customer_address: address,
    },
    success_url: `${base}/?order=success`,
    cancel_url: `${base}/?order=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}

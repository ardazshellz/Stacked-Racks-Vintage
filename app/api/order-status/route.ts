import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { sameOrigin, withinRateLimit } from "@/lib/server/request-security";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const { orderId, email } = await req.json().catch(() => ({ orderId: "", email: "" }));
  const safeOrderId = String(orderId ?? "").trim().toUpperCase().slice(0, 80);
  const safeEmail = String(email ?? "").trim().toLowerCase().slice(0, 254);
  if (!safeOrderId.startsWith("SR-") || !safeEmail.includes("@")) return NextResponse.json({ error: "Check your order number and email" }, { status: 400 });
  if (!(await withinRateLimit(req, "order-status", 12, 60 * 60, safeEmail))) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const { data } = await getSupabaseAdmin().from("orders")
    .select("id,item_name,total,date_of_sale,payment_status,fulfilment_status,tracking_number,dispatched_at")
    .eq("id", safeOrderId).ilike("customer_email", safeEmail).maybeSingle();
  if (!data) return NextResponse.json({ error: "We could not find a matching order" }, { status: 404 });
  return NextResponse.json({ order: data });
}

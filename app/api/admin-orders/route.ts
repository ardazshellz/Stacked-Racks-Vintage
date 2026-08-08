import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("*")
    .order("date_of_sale", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ orders: data });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.item_name || !body.customer_name || Number(body.total) <= 0) {
    return NextResponse.json({ error: "Customer, item and total are required" }, { status: 400 });
  }
  const row = {
    id: `SR-${Date.now().toString(36).toUpperCase()}`,
    source: "manual",
    item_name: String(body.item_name),
    brand: String(body.brand ?? ""),
    price: Number(body.price ?? body.total),
    postage: Number(body.postage ?? 0),
    total: Number(body.total),
    customer_name: String(body.customer_name),
    customer_email: String(body.customer_email ?? ""),
    customer_phone: String(body.customer_phone ?? ""),
    customer_address: String(body.customer_address ?? ""),
    payment_status: String(body.payment_status ?? "paid").toLowerCase(),
    notes: String(body.notes ?? ""),
    date_of_sale: String(body.date_of_sale ?? new Date().toISOString()),
  };
  const { data, error } = await getSupabaseAdmin().from("orders").insert(row).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { id?: string; payment_status?: string; notes?: string };
  if (!body.id) return NextResponse.json({ error: "Missing order id" }, { status: 400 });
  const changes: Record<string, string> = {};
  if (body.payment_status) changes.payment_status = body.payment_status.toLowerCase();
  if (typeof body.notes === "string") changes.notes = body.notes;
  const { data, error } = await getSupabaseAdmin().from("orders").update(changes).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data });
}

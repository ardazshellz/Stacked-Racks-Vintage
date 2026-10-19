import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { sameOrigin } from "@/lib/server/request-security";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { parseMoney } from "@/lib/sales";

const SOURCES = new Set(["vinted", "fleek", "other"]);

async function guard(req: Request, write: boolean) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (write && !sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  return null;
}

export async function GET(req: Request) {
  const denied = await guard(req, false);
  if (denied) return denied;
  const { data, error } = await getSupabaseAdmin().from("purchases").select("*").order("purchased_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ purchases: data });
}

// Adds purchases; rows with an external_id already stored (Vinted transaction, Fleek order) are updated, not duplicated.
export async function POST(req: Request) {
  const denied = await guard(req, true);
  if (denied) return denied;
  const body = (await req.json()) as { purchases?: Record<string, unknown>[] };
  const rows = [];
  for (const input of body.purchases ?? []) {
    const price = parseMoney(input.price);
    const quantity = Number(input.quantity ?? 1);
    const title = String(input.title ?? "").trim().slice(0, 200);
    const purchasedAt = String(input.purchased_at ?? "");
    if (!title || price === null || !/^\d{4}-\d{2}-\d{2}$/.test(purchasedAt) || !Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: `Each purchase needs a title, date (YYYY-MM-DD), price and quantity: ${title || "(no title)"}` }, { status: 400 });
    }
    rows.push({
      source: SOURCES.has(String(input.source)) ? String(input.source) : "other",
      external_id: input.external_id ? String(input.external_id).slice(0, 100) : null,
      title,
      seller: String(input.seller ?? "").slice(0, 100),
      purchased_at: purchasedAt,
      price,
      quantity,
      photo_url: String(input.photo_url ?? ""),
      notes: String(input.notes ?? "").slice(0, 500),
    });
  }
  if (!rows.length) return NextResponse.json({ error: "No purchases sent" }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("purchases").upsert(rows, { onConflict: "external_id" }).select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ purchases: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const denied = await guard(req, true);
  if (denied) return denied;
  const body = (await req.json()) as { id?: string; personal?: boolean; photo_url?: string; product_id?: string | null; notes?: string };
  if (!body.id) return NextResponse.json({ error: "Missing purchase id" }, { status: 400 });
  const changes: Record<string, unknown> = {};
  if (typeof body.personal === "boolean") changes.personal = body.personal;
  if (typeof body.photo_url === "string") changes.photo_url = body.photo_url;
  if (body.product_id === null || typeof body.product_id === "string") changes.product_id = body.product_id || null;
  if (typeof body.notes === "string") changes.notes = body.notes.slice(0, 500);
  const { data, error } = await getSupabaseAdmin().from("purchases").update(changes).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ purchase: data });
}

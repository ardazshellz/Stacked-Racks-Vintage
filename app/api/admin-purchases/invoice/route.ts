import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { sameOrigin } from "@/lib/server/request-security";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";

// Invoices hold the owner's address and phone, so they live in the private "invoices" bucket and are streamed only to the admin.
const MAX_BYTES = 4 * 1024 * 1024;

export async function GET(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing purchase id" }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: purchase } = await supabase.from("purchases").select("invoice_path").eq("id", id).single();
  if (!purchase?.invoice_path) return NextResponse.json({ error: "No invoice for this purchase" }, { status: 404 });
  const { data, error } = await supabase.storage.from("invoices").download(purchase.invoice_path);
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Could not load invoice" }, { status: 500 });
  return new Response(data, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline", "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const form = await req.formData();
  const id = String(form.get("id") ?? "");
  const file = form.get("file");
  if (!id || !(file instanceof File)) return NextResponse.json({ error: "Choose a PDF invoice" }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > MAX_BYTES || bytes.subarray(0, 5).toString() !== "%PDF-") {
    return NextResponse.json({ error: "Use a PDF invoice under 4MB" }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("purchases").select("invoice_path").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  const path = `${id}/${randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage.from("invoices").upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
  const { data, error } = await supabase.from("purchases").update({ invoice_path: path }).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (existing.invoice_path) await supabase.storage.from("invoices").remove([existing.invoice_path]);
  return NextResponse.json({ purchase: data });
}

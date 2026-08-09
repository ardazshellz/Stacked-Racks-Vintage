import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const runtime = "nodejs";

function validSecret(req: Request) {
  const configured = process.env.CRON_SECRET ?? "";
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const left = Buffer.from(configured);
  const right = Buffer.from(supplied);
  return configured.length >= 32 && left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(req: Request) {
  if (!validSecret(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const [orders, products, subscribers] = await Promise.all([
    supabase.from("orders").select("*"),
    supabase.from("products").select("*"),
    supabase.from("subscribers").select("email,consented_at,consent_source,unsubscribed_at,created_at"),
  ]);
  const error = orders.error ?? products.error ?? subscribers.error;
  if (error) return NextResponse.json({ error: "Backup query failed" }, { status: 500 });
  const now = new Date();
  const name = `${now.toISOString().slice(0, 10)}/stacked-racks-${now.toISOString().replaceAll(":", "-")}.json`;
  const payload = JSON.stringify({ createdAt: now.toISOString(), orders: orders.data, products: products.data, subscribers: subscribers.data });
  const { error: uploadError } = await supabase.storage.from("admin-backups").upload(name, payload, { contentType: "application/json", upsert: false });
  if (uploadError) return NextResponse.json({ error: "Backup upload failed" }, { status: 500 });

  const cutoff = Date.now() - 35 * 24 * 60 * 60 * 1000;
  const { data: folders } = await supabase.storage.from("admin-backups").list("", { limit: 100 });
  const oldFolders = (folders ?? []).filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.name) && new Date(`${entry.name}T00:00:00Z`).getTime() < cutoff);
  for (const folder of oldFolders) {
    const { data: files } = await supabase.storage.from("admin-backups").list(folder.name, { limit: 100 });
    const paths = (files ?? []).map((file) => `${folder.name}/${file.name}`);
    if (paths.length) await supabase.storage.from("admin-backups").remove(paths);
  }
  return NextResponse.json({ ok: true, backup: name });
}

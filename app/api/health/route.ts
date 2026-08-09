import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const { error } = await getSupabaseAdmin().from("products").select("id", { count: "exact", head: true });
  return NextResponse.json({ status: error ? "degraded" : "ok", database: error ? "unavailable" : "ok", responseMs: Date.now() - started }, { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}

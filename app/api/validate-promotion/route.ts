import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { sameOrigin, withinRateLimit } from "@/lib/server/request-security";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ valid: false }, { status: 403 });
  if (!(await withinRateLimit(req, "promotion-check", 20, 60 * 60))) return NextResponse.json({ valid: false }, { status: 429 });
  const { code } = await req.json().catch(() => ({ code: "" }));
  const normalized = String(code ?? "").trim().toUpperCase();
  if (normalized === "VINTAGE10") return NextResponse.json({ valid: true, percentOff: 10 });
  const { data } = await getSupabaseAdmin()
    .from("subscribers")
    .select("discount_code,unsubscribed_at,discount_redeemed_at")
    .eq("discount_code", normalized)
    .maybeSingle();
  return NextResponse.json({ valid: Boolean(data && !data.unsubscribed_at && !data.discount_redeemed_at), percentOff: 10 });
}

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { sameOrigin, withinRateLimit } from "@/lib/server/request-security";
import { WELCOME_DISCOUNT_CODE, WELCOME_DISCOUNT_PERCENT } from "@/lib/discount";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ valid: false }, { status: 403 });
  if (!(await withinRateLimit(req, "promotion-check", 20, 60 * 60))) return NextResponse.json({ valid: false }, { status: 429 });
  const { code, email } = await req.json().catch(() => ({ code: "", email: "" }));
  const normalized = String(code ?? "").trim().toUpperCase();
  const normalizedEmail = String(email ?? "").trim().toLowerCase().slice(0, 254);
  const query = getSupabaseAdmin()
    .from("subscribers")
    .select("discount_code,unsubscribed_at,discount_redeemed_at")
  const { data } = normalized === WELCOME_DISCOUNT_CODE
    ? await query.eq("email", normalizedEmail).maybeSingle()
    : await query.eq("discount_code", normalized).maybeSingle();
  return NextResponse.json({ valid: Boolean(data && !data.unsubscribed_at && !data.discount_redeemed_at), percentOff: WELCOME_DISCOUNT_PERCENT });
}

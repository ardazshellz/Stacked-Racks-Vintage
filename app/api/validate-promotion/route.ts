import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { sameOrigin, withinRateLimit } from "@/lib/server/request-security";
import { validatePromotion } from "@/lib/server/promotions";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ valid: false }, { status: 403 });
  if (!(await withinRateLimit(req, "promotion-check", 20, 60 * 60))) return NextResponse.json({ valid: false }, { status: 429 });
  const { code, email } = await req.json().catch(() => ({ code: "", email: "" }));
  const result = await validatePromotion(getSupabaseAdmin(), code, email);
  return NextResponse.json(result);
}

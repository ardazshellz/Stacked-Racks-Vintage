import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { WELCOME_DISCOUNT_CODE, WELCOME_DISCOUNT_PERCENT } from "@/lib/discount";
import { normalizePromotionCode } from "@/lib/promotions";

export type ValidPromotion = {
  valid: true;
  code: string;
  percentOff: number;
  source: "subscriber" | "promotion";
  subscriberEmail?: string;
};

export type PromotionResult = ValidPromotion | { valid: false };

export async function validatePromotion(
  supabase: SupabaseClient,
  rawCode: unknown,
  rawEmail: unknown,
): Promise<PromotionResult> {
  const code = normalizePromotionCode(rawCode);
  const email = String(rawEmail ?? "").trim().toLowerCase().slice(0, 254);
  if (!code || !email.includes("@")) return { valid: false };

  const subscriberQuery = supabase
    .from("subscribers")
    .select("email,discount_code,unsubscribed_at,discount_redeemed_at")
    .eq("email", email);
  const { data: subscriber } = code === WELCOME_DISCOUNT_CODE
    ? await subscriberQuery.maybeSingle()
    : await subscriberQuery.eq("discount_code", code).maybeSingle();

  if (subscriber && !subscriber.unsubscribed_at && !subscriber.discount_redeemed_at) {
    return { valid: true, code, percentOff: WELCOME_DISCOUNT_PERCENT, source: "subscriber", subscriberEmail: email };
  }

  const now = new Date().toISOString();
  const { data: promotion } = await supabase
    .from("promotion_codes")
    .select("code,percent_off,active,starts_at,expires_at,max_redemptions,redemption_count")
    .eq("code", code)
    .maybeSingle();
  if (!promotion || !promotion.active) return { valid: false };
  if (promotion.starts_at && promotion.starts_at > now) return { valid: false };
  if (promotion.expires_at && promotion.expires_at < now) return { valid: false };
  if (promotion.max_redemptions !== null && promotion.redemption_count >= promotion.max_redemptions) return { valid: false };

  return { valid: true, code, percentOff: Number(promotion.percent_off), source: "promotion" };
}

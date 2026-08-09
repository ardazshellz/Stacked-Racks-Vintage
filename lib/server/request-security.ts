import "server-only";

import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "./supabase";

function requestAddress(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

export async function withinRateLimit(req: Request, action: string, maximum: number, windowSeconds: number, identity = "") {
  const source = `${requestAddress(req)}:${identity.toLowerCase()}`;
  const keyHash = createHash("sha256").update(source).digest("hex");
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count, error } = await supabase
    .from("admin_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("key_hash", keyHash)
    .eq("action", action)
    .gte("created_at", since);
  if (error) {
    console.error("Rate-limit lookup failed:", error);
    return false;
  }
  if ((count ?? 0) >= maximum) return false;
  const { error: insertError } = await supabase.from("admin_rate_limits").insert({ key_hash: keyHash, action });
  if (insertError) {
    console.error("Rate-limit insert failed:", insertError);
    return false;
  }
  return true;
}

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const EVENTS = new Set(["page_view", "product_view", "product_click", "add_to_cart", "checkout_started"]);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  if (req.headers.get("content-length") && Number(req.headers.get("content-length")) > 8_000) {
    return new NextResponse(null, { status: 413 });
  }
  if (req.headers.get("cookie")?.includes("sr_analytics_exclude=1")) {
    return new NextResponse(null, { status: 204 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const eventName = clean(body?.event, 40);
  const visitorId = clean(body?.visitorId, 120);
  const sessionId = clean(body?.sessionId, 120);
  if (!body || !EVENTS.has(eventName) || visitorId.length < 16 || sessionId.length < 8) {
    return NextResponse.json({ error: "Invalid analytics event" }, { status: 400 });
  }

  const salt = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "stacked-racks";
  const visitorHash = createHash("sha256").update(`${salt}:${visitorId}`).digest("hex");
  let referrerHost = "";
  try {
    referrerHost = body.referrer ? new URL(clean(body.referrer, 500)).hostname.slice(0, 160) : "";
  } catch {}

  const { error } = await getSupabaseAdmin().from("site_events").insert({
    event_name: eventName,
    visitor_hash: visitorHash,
    session_id: sessionId,
    path: clean(body.path, 300) || "/",
    product_id: clean(body.productId, 120) || null,
    product_name: clean(body.productName, 220) || null,
    referrer_host: referrerHost || null,
  });
  if (error) return NextResponse.json({ error: "Analytics is not ready" }, { status: 503 });
  return new NextResponse(null, { status: 204 });
}

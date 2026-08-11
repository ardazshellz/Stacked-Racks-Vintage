import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase";

interface EventRow {
  event_name: string;
  visitor_hash: string;
  session_id: string;
  product_id: string | null;
  product_name: string | null;
  referrer_host: string | null;
  created_at: string;
}

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("site_events")
    .select("event_name,visitor_hash,session_id,product_id,product_name,referrer_host,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10_000);
  if (error) return NextResponse.json({ error: "Analytics migration has not been applied yet" }, { status: 503 });

  const rows = (data ?? []) as EventRow[];
  const views = rows.filter((row) => row.event_name === "page_view");
  const products = new Map<string, { id: string; name: string; views: number; clicks: number; carts: number }>();
  for (const row of rows) {
    if (!row.product_id) continue;
    const item = products.get(row.product_id) ?? { id: row.product_id, name: row.product_name || "Unnamed item", views: 0, clicks: 0, carts: 0 };
    if (row.event_name === "product_view") item.views += 1;
    if (row.event_name === "product_click") item.clicks += 1;
    if (row.event_name === "add_to_cart") item.carts += 1;
    products.set(row.product_id, item);
  }
  const referrers = new Map<string, number>();
  for (const row of views) {
    const source = row.referrer_host || "Direct / unknown";
    referrers.set(source, (referrers.get(source) ?? 0) + 1);
  }

  return NextResponse.json({
    range: "Last 30 days",
    pageViews: views.length,
    visitors: new Set(views.map((row) => row.visitor_hash)).size,
    sessions: new Set(views.map((row) => row.session_id)).size,
    productViews: rows.filter((row) => row.event_name === "product_view").length,
    checkoutStarts: rows.filter((row) => row.event_name === "checkout_started").length,
    products: [...products.values()].sort((a, b) => (b.views + b.clicks + b.carts) - (a.views + a.clicks + a.carts)).slice(0, 20),
    referrers: [...referrers].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count).slice(0, 10),
  });
}

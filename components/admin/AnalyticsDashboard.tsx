"use client";

import { useCallback, useEffect, useState } from "react";

interface AnalyticsData {
  range: string;
  pageViews: number;
  visitors: number;
  sessions: number;
  productViews: number;
  checkoutStarts: number;
  products: Array<{ id: string; name: string; views: number; clicks: number; carts: number }>;
  referrers: Array<{ source: string; count: number }>;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin-analytics", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Could not load analytics");
    else { setData(body); setError(""); }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <p className="text-[#777] text-sm">Loading analytics…</p>;
  if (error) return <div className="border border-amber-500/30 bg-amber-500/10 text-amber-200 p-5 text-sm">{error}</div>;
  if (!data) return null;

  const stats = [
    ["Visitors", data.visitors], ["Page views", data.pageViews], ["Sessions", data.sessions],
    ["Product views", data.productViews], ["Checkout starts", data.checkoutStarts],
  ];
  return <section>
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div><h2 className="text-2xl font-black">Website analytics</h2><p className="text-[#777] text-xs mt-1">{data.range} · consented visitors only · your signed-in browser is excluded</p></div>
      <button onClick={() => void load()} className="border border-white/15 px-4 py-2 text-[10px] font-black tracking-wider uppercase">Refresh</button>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-7">{stats.map(([label, value]) => <div key={label} className="bg-[#111] border border-white/8 p-5"><p className="text-[#888] text-[9px] uppercase tracking-[0.18em] mb-2">{label}</p><p className="text-2xl font-black">{value}</p></div>)}</div>
    <div className="grid lg:grid-cols-[2fr_1fr] gap-5">
      <div className="bg-[#111] border border-white/8 overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr className="border-b border-white/10">{["Item", "Views", "Card clicks", "Added to cart"].map((heading) => <th key={heading} className="px-4 py-3 text-[#888] text-[9px] tracking-[0.16em] uppercase">{heading}</th>)}</tr></thead><tbody>{data.products.map((item) => <tr key={item.id} className="border-b border-white/5"><td className="px-4 py-3 text-sm font-semibold">{item.name}</td><td className="px-4 py-3 text-sm">{item.views}</td><td className="px-4 py-3 text-sm">{item.clicks}</td><td className="px-4 py-3 text-sm text-[#E8500A] font-bold">{item.carts}</td></tr>)}</tbody></table>{!data.products.length && <p className="p-5 text-[#666] text-sm">No product activity yet.</p>}</div>
      <div className="bg-[#111] border border-white/8 p-5"><h3 className="font-black mb-4">Traffic sources</h3><div className="space-y-3">{data.referrers.map((item) => <div key={item.source} className="flex justify-between gap-3 border-b border-white/5 pb-2"><span className="text-[#aaa] text-xs truncate">{item.source}</span><strong>{item.count}</strong></div>)}{!data.referrers.length && <p className="text-[#666] text-sm">No referrer data yet.</p>}</div></div>
    </div>
  </section>;
}

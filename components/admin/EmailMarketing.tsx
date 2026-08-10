"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Subscriber = { email: string; discount_code: string; consent_source: string; consented_at: string; unsubscribed_at: string | null; discount_redeemed_at: string | null };
type Promotion = { code: string; percent_off: number; description: string; active: boolean; expires_at: string | null; max_redemptions: number | null; redemption_count: number };
type Campaign = { id: string; subject: string; status: string; sent_count: number; failed_count: number; created_at: string };

const INPUT = "w-full bg-[#171717] border border-white/10 text-white text-sm px-3 py-2.5 outline-none focus:border-[#E8500A]/70 placeholder:text-[#555]";
const LABEL = "block text-[#777] text-[9px] font-black tracking-[0.18em] uppercase mb-1.5";

function exportSubscribers(subscribers: Subscriber[]) {
  const lines = ["Email,Joined,Source,Status,Discount redeemed", ...subscribers.map((subscriber) => [subscriber.email, new Date(subscriber.consented_at).toLocaleDateString("en-GB"), subscriber.consent_source, subscriber.unsubscribed_at ? "Unsubscribed" : "Active", subscriber.discount_redeemed_at ? "Yes" : "No"].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))];
  const url = URL.createObjectURL(new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `stacked-racks-email-list-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function EmailMarketing() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [promo, setPromo] = useState({ code: "", percentOff: 10, description: "", expiresAt: "", maxRedemptions: "" });
  const [draft, setDraft] = useState({ keywords: "", recommendedItems: "", promotionCode: "", subject: "", previewText: "", body: "", testEmail: "" });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const response = await fetch("/api/admin-email", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error ?? "Could not load email marketing data");
    else { setSubscribers(data.subscribers ?? []); setPromotions(data.promotions ?? []); setCampaigns(data.campaigns ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const activeSubscribers = subscribers.filter((subscriber) => !subscriber.unsubscribed_at);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? subscribers.filter((subscriber) => subscriber.email.includes(query)) : subscribers;
  }, [search, subscribers]);

  const post = async (payload: Record<string, unknown>) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "The request failed");
      return data;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The request failed");
      return null;
    } finally { setBusy(false); }
  };

  const createPromotion = async () => {
    const data = await post({ action: "create-promotion", ...promo });
    if (!data) return;
    setMessage(`${data.promotion.code} is now available at checkout.`);
    setPromo({ code: "", percentOff: 10, description: "", expiresAt: "", maxRedemptions: "" });
    await load();
  };

  const generate = async () => {
    const selected = promotions.find((promotion) => promotion.code === draft.promotionCode);
    const data = await post({ action: "generate", ...draft, percentOff: selected?.percent_off ?? 0 });
    if (!data) return;
    setDraft((current) => ({ ...current, ...data.draft }));
    setMessage("Draft generated. Edit anything you like before saving or sending.");
  };

  const send = async () => {
    if (!window.confirm(`Send this email to ${activeSubscribers.length} active subscriber${activeSubscribers.length === 1 ? "" : "s"}?`)) return;
    const data = await post({ action: "send", confirm: "SEND", ...draft });
    if (!data) return;
    setMessage(`Campaign finished: ${data.sentCount} sent${data.failedCount ? `, ${data.failedCount} failed` : ""}.`);
    await load();
  };

  return <section className="space-y-6">
    <div className="grid sm:grid-cols-3 gap-3">
      {[{ label: "Active subscribers", value: activeSubscribers.length }, { label: "Used welcome discount", value: subscribers.filter((subscriber) => subscriber.discount_redeemed_at).length }, { label: "Unsubscribed", value: subscribers.filter((subscriber) => subscriber.unsubscribed_at).length }].map((stat) => <div key={stat.label} className="bg-[#111] border border-white/8 p-5"><p className="text-[#888] text-[9px] uppercase tracking-[0.2em] mb-2">{stat.label}</p><p className="text-2xl font-black">{stat.value}</p></div>)}
    </div>
    {(error || message) && <div className={`border p-4 text-sm ${error ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>{error || message}</div>}

    <div className="grid xl:grid-cols-[1fr_390px] gap-6 items-start">
      <div className="bg-[#111] border border-white/8 p-5 sm:p-6 space-y-4">
        <div><p className="text-[#E8500A] text-[9px] font-black tracking-[0.25em] uppercase mb-2">Campaign studio</p><h2 className="text-xl font-black">Generate an email from keywords</h2><p className="text-[#777] text-xs mt-1">This generator is included in the site and does not use a paid AI service.</p></div>
        <label><span className={LABEL}>Keywords / theme</span><textarea rows={2} value={draft.keywords} onChange={(event) => setDraft({ ...draft, keywords: event.target.value })} placeholder="New Nike tees, 90s streetwear, weekend drop" className={INPUT} /></label>
        <label><span className={LABEL}>Recommended items</span><textarea rows={3} value={draft.recommendedItems} onChange={(event) => setDraft({ ...draft, recommendedItems: event.target.value })} placeholder="One item per line, or short product names separated by commas" className={INPUT} /></label>
        <label><span className={LABEL}>Promotion to include (optional)</span><select value={draft.promotionCode} onChange={(event) => setDraft({ ...draft, promotionCode: event.target.value })} className={INPUT}><option value="">No promotion</option>{promotions.filter((promotion) => promotion.active).map((promotion) => <option key={promotion.code} value={promotion.code}>{promotion.code} — {promotion.percent_off}% off</option>)}</select></label>
        <button onClick={() => void generate()} disabled={busy || !draft.keywords.trim()} className="bg-[#F5C300] disabled:opacity-40 text-black font-black text-xs tracking-[0.16em] uppercase px-5 py-3">Generate email draft</button>
        <div className="border-t border-white/8 pt-4 space-y-4"><label><span className={LABEL}>Subject</span><input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} className={INPUT} /></label><label><span className={LABEL}>Inbox preview</span><input value={draft.previewText} onChange={(event) => setDraft({ ...draft, previewText: event.target.value })} className={INPUT} /></label><label><span className={LABEL}>Email message</span><textarea rows={12} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} className={INPUT} /></label></div>
        <div className="flex flex-wrap gap-3"><button onClick={async () => { const data = await post({ action: "save-draft", ...draft }); if (data) { setMessage("Email saved as a draft."); await load(); } }} disabled={busy || !draft.subject || !draft.body} className="border border-white/15 text-white px-4 py-3 text-xs font-bold">Save draft</button><button onClick={async () => { const data = await post({ action: "send-test", ...draft }); if (data) setMessage(`Test sent to ${data.sentTo}.`); }} disabled={busy || !draft.subject || !draft.body} className="border border-[#F5C300]/40 text-[#F5C300] px-4 py-3 text-xs font-bold">Send test email</button><button onClick={() => void send()} disabled={busy || !draft.subject || !draft.body || !activeSubscribers.length} className="bg-[#E8500A] disabled:opacity-40 px-5 py-3 text-xs font-black uppercase tracking-wider">Send to {activeSubscribers.length} active subscribers</button></div>
      </div>

      <aside className="space-y-6">
        <div className="bg-[#111] border border-white/8 p-5 space-y-3"><div><p className="text-[#F5C300] text-[9px] font-black tracking-[0.2em] uppercase mb-2">Checkout promotions</p><h3 className="font-black">Create a promo code</h3></div><label><span className={LABEL}>Code</span><input value={promo.code} onChange={(event) => setPromo({ ...promo, code: event.target.value.toUpperCase() })} placeholder="WEEKEND15" className={INPUT} /></label><div className="grid grid-cols-2 gap-3"><label><span className={LABEL}>Discount %</span><input type="number" min="1" max="100" value={promo.percentOff} onChange={(event) => setPromo({ ...promo, percentOff: Number(event.target.value) })} className={INPUT} /></label><label><span className={LABEL}>Maximum uses</span><input type="number" min="1" value={promo.maxRedemptions} onChange={(event) => setPromo({ ...promo, maxRedemptions: event.target.value })} placeholder="Unlimited" className={INPUT} /></label></div><label><span className={LABEL}>Expiry (optional)</span><input type="datetime-local" value={promo.expiresAt} onChange={(event) => setPromo({ ...promo, expiresAt: event.target.value })} className={INPUT} /></label><label><span className={LABEL}>Private note</span><input value={promo.description} onChange={(event) => setPromo({ ...promo, description: event.target.value })} placeholder="August newsletter" className={INPUT} /></label><button onClick={() => void createPromotion()} disabled={busy || promo.code.length < 4} className="w-full bg-[#F5C300] disabled:opacity-40 text-black py-3 text-xs font-black uppercase tracking-wider">Make code work at checkout</button>{promotions.length > 0 && <div className="border-t border-white/8 pt-3 space-y-2">{promotions.slice(0, 6).map((promotion) => <div key={promotion.code} className="flex justify-between text-xs"><span className="font-bold text-[#F5C300]">{promotion.code} · {promotion.percent_off}%</span><span className="text-[#777]">{promotion.redemption_count}{promotion.max_redemptions ? `/${promotion.max_redemptions}` : ""} uses</span></div>)}</div>}</div>
        <div className="bg-[#111] border border-white/8 p-5"><h3 className="font-black mb-3">Recent campaigns</h3><div className="space-y-3">{campaigns.slice(0, 6).map((campaign) => <div key={campaign.id} className="border-b border-white/8 pb-3"><p className="text-sm font-bold">{campaign.subject}</p><p className="text-[#777] text-[10px] mt-1 uppercase">{campaign.status} · {campaign.sent_count} sent · {new Date(campaign.created_at).toLocaleDateString("en-GB")}</p></div>)}{!campaigns.length && <p className="text-[#666] text-xs">No campaigns yet.</p>}</div></div>
      </aside>
    </div>

    <div className="bg-[#111] border border-white/8 p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3 mb-4"><div><h2 className="text-xl font-black">Email list</h2><p className="text-[#777] text-xs mt-1">Only people who actively signed up appear here. Discount codes are private to Admin and the subscriber&apos;s email.</p></div><div className="flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value.toLowerCase())} placeholder="Search email…" className={`${INPUT} max-w-xs`} /><button onClick={() => exportSubscribers(filtered)} className="border border-white/15 px-4 text-[10px] font-black uppercase">Export CSV</button></div></div>{loading ? <p className="text-[#777] text-xs py-8">Loading subscribers…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-white/10">{["Email", "Joined", "Source", "Status", "Welcome discount"].map((heading) => <th key={heading} className="py-3 px-3 text-[#888] text-[9px] tracking-[0.18em] uppercase">{heading}</th>)}</tr></thead><tbody>{filtered.map((subscriber) => <tr key={subscriber.email} className="border-b border-white/5"><td className="py-3 px-3 text-sm font-semibold">{subscriber.email}</td><td className="py-3 px-3 text-[#999] text-xs">{new Date(subscriber.consented_at).toLocaleDateString("en-GB")}</td><td className="py-3 px-3 text-[#999] text-xs uppercase">{subscriber.consent_source}</td><td className="py-3 px-3 text-xs"><span className={subscriber.unsubscribed_at ? "text-red-300" : "text-emerald-300"}>{subscriber.unsubscribed_at ? "Unsubscribed" : "Active"}</span></td><td className="py-3 px-3 text-xs"><span className="font-mono text-[#F5C300]">{subscriber.discount_code}</span><span className="text-[#777] ml-2">{subscriber.discount_redeemed_at ? "Used" : "Unused"}</span></td></tr>)}</tbody></table>{!filtered.length && <p className="text-[#666] text-xs py-10 text-center">No matching subscribers.</p>}</div>}</div>
  </section>;
}

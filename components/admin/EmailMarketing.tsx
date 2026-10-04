"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { campaignHtml, dropEmailHtml, type DropEmailItem } from "@/lib/email-html";
import { isNew, productMatchesGender, productSizeLabel, type Product } from "@/lib/products";
import { normalizePromotionCode } from "@/lib/promotions";

type Subscriber = { email: string; discount_code: string; consent_source: string; consented_at: string; unsubscribed_at: string | null; discount_redeemed_at: string | null };
type Promotion = { code: string; percent_off: number; description: string; active: boolean; expires_at: string | null; max_redemptions: number | null; redemption_count: number };
type Campaign = { id: string; subject: string; status: string; sent_count: number; failed_count: number; created_at: string };

const INPUT = "w-full bg-[#171717] border border-white/10 text-white text-sm px-3 py-2.5 outline-none focus:border-[#E8500A]/70 placeholder:text-[#555]";
const LABEL = "block text-[#777] text-[9px] font-black tracking-[0.18em] uppercase mb-1.5";
const FILTERS = ["All", "Posted today", "Last 7 days", "Men's", "Women's", "Marquee"] as const;
type ItemFilter = (typeof FILTERS)[number];

function ukDate() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" }).format(new Date()).toUpperCase();
}

function ukIsoDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

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
  const [items, setItems] = useState<Product[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemFilter, setItemFilter] = useState<ItemFilter>("All");
  const [drop, setDrop] = useState({ subject: "New drop: 0 one-off vintage pieces", intro: "Fresh one-off vintage pieces have landed. Pick your favourites before they go.", dateLine: ukDate(), promotionEnabled: false, percentOff: 10, code: "DROP10", testEmail: "zakeryshelley1997@gmail.com" });
  const [subjectEdited, setSubjectEdited] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [campaignPreviewOpen, setCampaignPreviewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [promo, setPromo] = useState({ code: "", percentOff: 10, description: "", expiresAt: "", maxRedemptions: "" });
  const [draft, setDraft] = useState({ keywords: "", recommendedItems: "", promotionCode: "", subject: "", previewText: "", body: "", testEmail: "" });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin-email", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not load email marketing data");
      const nextSubscribers: Subscriber[] = data.subscribers ?? [];
      const nextItems: Product[] = data.items ?? [];
      setSubscribers(nextSubscribers); setPromotions(data.promotions ?? []); setCampaigns(data.campaigns ?? []);
      setItems(nextItems);
      const active = new Set(nextSubscribers.filter((subscriber) => !subscriber.unsubscribed_at).map((subscriber) => subscriber.email));
      const available = new Set(nextItems.map((item) => String(item.id)));
      setSelectedEmails((current) => current.filter((email) => active.has(email)));
      setSelectedItemIds((current) => current.filter((id) => available.has(id)));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load email marketing data");
    } finally { setLoading(false); }
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
  const selectedItems = useMemo(() => {
    const byId = new Map(items.map((item) => [String(item.id), item]));
    return selectedItemIds.flatMap((id) => { const item = byId.get(id); return item ? [item] : []; });
  }, [items, selectedItemIds]);
  const visibleItems = useMemo(() => {
    const today = ukIsoDate();
    const sevenDaysAgo = new Date(`${today}T00:00:00Z`);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
    const earliest = sevenDaysAgo.toISOString().slice(0, 10);
    return items.filter((item) => item.stock > 0 && item.listingStatus !== "draft").filter((item) => {
      const date = item.listedDate?.slice(0, 10);
      switch (itemFilter) {
        case "Posted today": return date === today;
        case "Last 7 days": return isNew({ ...item, listedDate: date }) && date >= earliest && date <= today;
        case "Men's": return productMatchesGender(item, "Mens");
        case "Women's": return productMatchesGender(item, "Womens");
        case "Marquee": return item.badge === "RARE";
        default: return true;
      }
    }).sort((a, b) => Date.parse(b.listedDate) - Date.parse(a.listedDate));
  }, [items, itemFilter]);
  const emailItems: DropEmailItem[] = selectedItems.map((item) => ({ id: item.id, name: item.name, size: productSizeLabel(item), price: item.price, imageUrls: item.imageUrls, gender: item.gender, secondaryGender: item.secondaryGender, category: item.category, brand: item.brand }));
  const dropSubject = subjectEdited ? drop.subject : `New drop: ${selectedItems.length} one-off vintage pieces`;
  const dropCode = normalizePromotionCode(drop.code);
  const dropError = selectedItemIds.length < 1 ? "Select at least one item." : selectedItemIds.length > 12 ? "Select no more than 12 items." : selectedEmails.length < 1 ? "Select at least one subscribed email." : selectedEmails.length > 200 ? "Select no more than 200 subscribers." : !dropSubject.trim() ? "Enter a subject." : !drop.dateLine.trim() ? "Enter a date line." : drop.promotionEnabled && (!Number.isInteger(drop.percentOff) || drop.percentOff < 1 || drop.percentOff > 90 || dropCode.length < 4) ? "Enter a discount from 1–90% and a valid code of at least 4 characters." : "";
  const previewHtml = previewOpen && selectedItems.length ? dropEmailHtml({ items: emailItems, intro: drop.intro.trim().slice(0, 1000), dateLine: drop.dateLine.trim().slice(0, 100), promotion: { enabled: drop.promotionEnabled, percentOff: drop.percentOff, code: dropCode }, unsubscribeUrl: "https://stackedracksvintage.co.uk/unsubscribe" }) : "";
  const campaignPreviewHtml = campaignPreviewOpen ? campaignHtml(draft.body.trim().slice(0, 12000), draft.previewText.trim().slice(0, 160), "https://stackedracksvintage.co.uk/unsubscribe", emailItems) : "";

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

  const cancelPromotion = async (promotion: Promotion) => {
    if (!window.confirm(`Cancel ${promotion.code}? It will stop working at checkout immediately.`)) return;
    const data = await post({ action: "cancel-promotion", code: promotion.code });
    if (!data) return;
    setMessage(`${promotion.code} has been cancelled and no longer works at checkout.`);
    setDraft((current) => current.promotionCode === promotion.code ? { ...current, promotionCode: "" } : current);
    await load();
  };

  const generate = async () => {
    const selected = promotions.find((promotion) => promotion.code === draft.promotionCode);
    const data = await post({ action: "generate", ...draft, recommendedItems: selectedItems.map((item) => item.name).join("\n"), percentOff: selected?.percent_off ?? 0 });
    if (!data) return;
    setDraft((current) => ({ ...current, ...data.draft }));
    setMessage("Draft generated. Edit anything you like before saving or sending.");
  };

  const send = async () => {
    if (!window.confirm(`Send this email to ${activeSubscribers.length} active subscriber${activeSubscribers.length === 1 ? "" : "s"}?`)) return;
    const data = await post({ action: "send", confirm: "SEND", ...draft, itemIds: selectedItemIds });
    if (!data) return;
    setMessage(`Campaign finished: ${data.sentCount} sent${data.failedCount ? `, ${data.failedCount} failed` : ""}.`);
    await load();
  };

  const dropPayload = () => ({ itemIds: selectedItems.map((item) => item.id), emails: selectedEmails, subject: dropSubject.trim(), intro: drop.intro.trim(), dateLine: drop.dateLine.trim(), promotionEnabled: drop.promotionEnabled, percentOff: drop.percentOff, code: dropCode, testEmail: drop.testEmail.trim() });
  const sendDropTest = async () => {
    if (!selectedItems.length || selectedItems.length > 12 || !dropSubject.trim() || !drop.dateLine.trim()) { setError("Select 1–12 items and enter a subject and date line before sending a test."); return; }
    if (drop.promotionEnabled && (!Number.isInteger(drop.percentOff) || drop.percentOff < 1 || drop.percentOff > 90 || dropCode.length < 4)) { setError("Enter a discount from 1–90% and a valid code of at least 4 characters."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(drop.testEmail.trim())) { setError("Enter a valid test email address."); return; }
    const data = await post({ action: "send-drop-test", ...dropPayload() });
    if (data) {
      if (data.sentCount > 0 && !data.failedCount) setMessage(`Test sent to ${data.sentTo ?? drop.testEmail.trim()}.`);
      else setError(`Test failed to send${data.failedCount ? ` (${data.failedCount} failed)` : ""}.`);
    }
  };
  const sendDrop = async () => {
    if (dropError) { setError(dropError); return; }
    if (window.prompt(`Send this drop to ${selectedEmails.length} selected subscriber${selectedEmails.length === 1 ? "" : "s"}? Type SEND to confirm.`) !== "SEND") return;
    const data = await post({ action: "send-drop", ...dropPayload(), confirm: "SEND" });
    if (!data) return;
    setMessage(`Drop finished: ${data.sentCount} sent${data.failedCount ? `, ${data.failedCount} failed` : ""}${data.skippedCount ? `, ${data.skippedCount} skipped` : ""}.`);
    await load();
  };
  const toggleEmail = (email: string) => setSelectedEmails((current) => current.includes(email) ? current.filter((value) => value !== email) : [...current, email]);
  const toggleItem = (id: string) => setSelectedItemIds((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < 12 ? [...current, id] : current);

  return <section className="space-y-6">
    <div className="grid sm:grid-cols-3 gap-3">
      {[{ label: "Active subscribers", value: activeSubscribers.length }, { label: "Used welcome discount", value: subscribers.filter((subscriber) => subscriber.discount_redeemed_at).length }, { label: "Unsubscribed", value: subscribers.filter((subscriber) => subscriber.unsubscribed_at).length }].map((stat) => <div key={stat.label} className="bg-[#111] border border-white/8 p-5"><p className="text-[#888] text-[9px] uppercase tracking-[0.2em] mb-2">{stat.label}</p><p className="text-2xl font-black">{stat.value}</p></div>)}
    </div>
    {(error || message) && <div className={`border p-4 text-sm ${error ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>{error || message}</div>}

    <div>
      <div className="bg-[#111] border border-white/8 p-5 sm:p-6 space-y-5">
        <div><p className="text-[#E8500A] text-[9px] font-black tracking-[0.25em] uppercase mb-2">New drop email</p><h2 className="text-xl font-black">Build a drop from your stock</h2><p className="text-[#777] text-xs mt-1">Choose stock and subscribers, preview the email, then send a test.</p></div>
        <div className="border border-white/10 p-4 space-y-3"><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={drop.promotionEnabled} onChange={(event) => setDrop((current) => ({ ...current, promotionEnabled: event.target.checked }))} className="accent-[#E8500A]" /> Include a checkout promotion</label>{drop.promotionEnabled && <><div className="grid sm:grid-cols-2 gap-3"><label><span className={LABEL}>Discount %</span><input type="number" min="1" max="90" step="1" value={drop.percentOff} onChange={(event) => setDrop((current) => ({ ...current, percentOff: Number(event.target.value) }))} className={INPUT} /></label><label><span className={LABEL}>Code</span><input value={drop.code} onChange={(event) => setDrop((current) => ({ ...current, code: event.target.value }))} onBlur={() => setDrop((current) => ({ ...current, code: normalizePromotionCode(current.code) }))} className={INPUT} /></label></div><p className="text-[#777] text-xs">The code will be activated when you send the drop to subscribers.</p></>}</div>
        <label><span className={LABEL}>Subject</span><input lang="en-GB" spellCheck value={dropSubject} onChange={(event) => { setSubjectEdited(true); setDrop((current) => ({ ...current, subject: event.target.value })); }} className={INPUT} /></label>
        <label><span className={LABEL}>Intro line</span><textarea rows={2} lang="en-GB" spellCheck value={drop.intro} onChange={(event) => setDrop((current) => ({ ...current, intro: event.target.value }))} className={INPUT} /></label>
        <label><span className={LABEL}>Date line</span><input lang="en-GB" spellCheck value={drop.dateLine} onChange={(event) => setDrop((current) => ({ ...current, dateLine: event.target.value }))} className={INPUT} /></label>
        <div className="flex flex-wrap gap-3 items-end"><button onClick={() => { if (!selectedItems.length) { setError("Select at least one item to preview."); return; } setError(""); setPreviewOpen(true); }} disabled={loading || !selectedItems.length} className="border border-white/20 disabled:opacity-40 px-4 py-3 text-xs font-black uppercase tracking-wider">Preview</button><label className="grow min-w-[220px]"><span className={LABEL}>Test email address</span><input type="email" value={drop.testEmail} onChange={(event) => setDrop((current) => ({ ...current, testEmail: event.target.value }))} className={INPUT} /></label><button onClick={() => void sendDropTest()} disabled={busy || loading || !selectedItems.length || selectedItems.length > 12} className="border border-[#F5C300]/40 disabled:opacity-40 text-[#F5C300] px-4 py-3 text-xs font-bold">Send test to me</button></div>
        {previewOpen && <div><div className="flex items-center justify-between mb-2"><h3 className="text-sm font-black">Preview</h3><button onClick={() => setPreviewOpen(false)} className="text-[#999] text-xs underline">Close</button></div>{previewHtml ? <iframe title="Drop email preview" sandbox="" srcDoc={previewHtml} className="w-full h-[640px] border border-white/10 bg-[#0A0A0A]" /> : <p className="text-[#777] text-xs">Select an item to preview the drop.</p>}</div>}
        {dropError && <p className="text-[#F5C300] text-xs" role="status">{dropError}</p>}
        <button onClick={() => void sendDrop()} disabled={busy || loading || Boolean(dropError)} className="bg-[#E8500A] disabled:opacity-40 px-5 py-3 text-xs font-black uppercase tracking-wider">Send to {selectedEmails.length} selected</button>
      </div>
    </div>

    <div className="bg-[#111] border border-white/8 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4"><div><h2 className="text-xl font-black">Email list</h2><p className="text-[#777] text-xs mt-1">{selectedEmails.length} selected · Only subscribed addresses can receive a drop.</p></div><div className="flex gap-2"><input type="search" aria-label="Search email" value={search} onChange={(event) => setSearch(event.target.value.toLowerCase())} placeholder="Search email…" className={`${INPUT} max-w-xs`} /><button onClick={() => exportSubscribers(filtered)} className="border border-white/15 px-4 text-[10px] font-black uppercase">Export CSV</button></div></div>
      <label className="inline-flex items-center gap-2 text-xs font-bold mb-3"><input type="checkbox" className="accent-[#E8500A]" checked={activeSubscribers.length > 0 && activeSubscribers.every((subscriber) => selectedEmails.includes(subscriber.email))} onChange={(event) => setSelectedEmails(event.target.checked ? activeSubscribers.map((subscriber) => subscriber.email) : [])} disabled={!activeSubscribers.length} />Select all subscribed</label>
      {selectedEmails.length > 200 && <p className="text-[#F5C300] text-xs mb-3" role="status">{selectedEmails.length} selected. Reduce this to 200 or fewer before sending.</p>}
      {loading ? <p className="text-[#777] text-xs py-8">Loading subscribers…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="border-b border-white/10">{["Select", "Email", "Signed up", "Status", "Discount redeemed"].map((heading) => <th key={heading} className="py-3 px-3 text-[#888] text-[9px] tracking-[0.18em] uppercase">{heading}</th>)}</tr></thead><tbody>{filtered.map((subscriber) => <tr key={subscriber.email} className="border-b border-white/5"><td className="py-3 px-3"><input type="checkbox" aria-label={`Select ${subscriber.email}`} checked={selectedEmails.includes(subscriber.email)} disabled={Boolean(subscriber.unsubscribed_at)} onChange={() => toggleEmail(subscriber.email)} className="accent-[#E8500A]" /></td><td className="py-3 px-3 text-sm font-semibold">{subscriber.email}</td><td className="py-3 px-3 text-[#999] text-xs">{new Date(subscriber.consented_at).toLocaleDateString("en-GB")}</td><td className="py-3 px-3 text-xs"><span className={subscriber.unsubscribed_at ? "text-red-300" : "text-emerald-300"}>{subscriber.unsubscribed_at ? "Unsubscribed" : "Subscribed"}</span></td><td className="py-3 px-3 text-xs text-[#999]">{subscriber.discount_redeemed_at ? "Yes" : "No"}</td></tr>)}</tbody></table>{!filtered.length && <p className="text-[#666] text-xs py-10 text-center">No matching subscribers.</p>}</div>}
    </div>

    <div className="grid xl:grid-cols-[1fr_390px] gap-6 items-start">
      <div className="bg-[#111] border border-white/8 p-5 sm:p-6 space-y-4">
        <div><p className="text-[#E8500A] text-[9px] font-black tracking-[0.25em] uppercase mb-2">Campaign studio</p><h2 className="text-xl font-black">Generate an email from keywords</h2><p className="text-[#777] text-xs mt-1">This generator is included in the site and does not use a paid AI service.</p></div>
        <label><span className={LABEL}>Keywords / theme</span><textarea rows={2} lang="en-GB" spellCheck value={draft.keywords} onChange={(event) => setDraft({ ...draft, keywords: event.target.value })} placeholder="New Nike tees, 90s streetwear, weekend drop" className={INPUT} /></label>
        <label><span className={LABEL}>Promotion to include (optional)</span><select value={draft.promotionCode} onChange={(event) => setDraft({ ...draft, promotionCode: event.target.value })} className={INPUT}><option value="">No promotion</option>{promotions.filter((promotion) => promotion.active).map((promotion) => <option key={promotion.code} value={promotion.code}>{promotion.code} — {promotion.percent_off}% off</option>)}</select></label>
        <button onClick={() => void generate()} disabled={busy || !draft.keywords.trim()} className="bg-[#F5C300] disabled:opacity-40 text-black font-black text-xs tracking-[0.16em] uppercase px-5 py-3">Generate email draft</button>
        <div className="border-t border-white/8 pt-4 space-y-4"><label><span className={LABEL}>Subject</span><input lang="en-GB" spellCheck value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} className={INPUT} /></label><label><span className={LABEL}>Inbox preview</span><input lang="en-GB" spellCheck value={draft.previewText} onChange={(event) => setDraft({ ...draft, previewText: event.target.value })} className={INPUT} /></label><label><span className={LABEL}>Email message</span><textarea rows={16} lang="en-GB" spellCheck value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} className={INPUT} /></label></div>
        <div className="flex flex-wrap gap-3"><button onClick={async () => { const data = await post({ action: "save-draft", ...draft }); if (data) { setMessage("Email saved as a draft."); await load(); } }} disabled={busy || !draft.subject || !draft.body} className="border border-white/15 text-white px-4 py-3 text-xs font-bold">Save draft</button><button onClick={() => setCampaignPreviewOpen(true)} disabled={!draft.body.trim()} className="border border-white/15 disabled:opacity-40 text-white px-4 py-3 text-xs font-bold">Preview</button><button onClick={async () => { const data = await post({ action: "send-test", ...draft, itemIds: selectedItemIds }); if (data) setMessage(`Test sent to ${data.sentTo}.`); }} disabled={busy || !draft.subject || !draft.body} className="border border-[#F5C300]/40 text-[#F5C300] px-4 py-3 text-xs font-bold">Send test email</button><button onClick={() => void send()} disabled={busy || !draft.subject || !draft.body || !activeSubscribers.length} className="bg-[#E8500A] disabled:opacity-40 px-5 py-3 text-xs font-black uppercase tracking-wider">Send to {activeSubscribers.length} active subscribers</button></div>
        {campaignPreviewOpen && <div><div className="flex items-center justify-between mb-2"><h3 className="text-sm font-black">Campaign preview</h3><button onClick={() => setCampaignPreviewOpen(false)} className="text-[#999] text-xs underline">Close</button></div><iframe title="Campaign email preview" sandbox="" srcDoc={campaignPreviewHtml} className="w-full h-[640px] border border-white/10 bg-[#0A0A0A]" /></div>}
      </div>

      <aside className="space-y-6">
        <div className="bg-[#111] border border-white/8 p-5"><h3 className="font-black mb-3">Recent campaigns</h3><div className="space-y-3">{campaigns.slice(0, 6).map((campaign) => <div key={campaign.id} className="border-b border-white/8 pb-3"><p className="text-sm font-bold">{campaign.subject}</p><p className="text-[#777] text-[10px] mt-1 uppercase">{campaign.status} · {campaign.sent_count} sent · {new Date(campaign.created_at).toLocaleDateString("en-GB")}</p></div>)}{!campaigns.length && <p className="text-[#666] text-xs">No campaigns yet.</p>}</div></div>
        <div className="bg-[#111] border border-white/8 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-black">Items to be included</h3><p className="text-[#777] text-xs mt-1">The selected order is used in the drop and campaign emails. Maximum 12.</p></div><button type="button" onClick={() => setSelectedItemIds([])} disabled={!selectedItemIds.length} className="text-[#E8500A] disabled:opacity-40 text-xs font-bold underline">Clear</button></div>
          <p className="text-[#F5C300] text-xs font-bold" role="status">{selectedItemIds.length} selected</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter items">{FILTERS.map((filter) => <button key={filter} type="button" onClick={() => setItemFilter(filter)} aria-pressed={itemFilter === filter} className={`px-2.5 py-1.5 text-[10px] font-bold border ${itemFilter === filter ? "border-[#E8500A] text-[#E8500A]" : "border-white/15 text-[#999]"}`}>{filter}</button>)}</div>
          {loading ? <p className="text-[#777] text-xs">Loading items…</p> : <div className="grid grid-cols-2 gap-2 max-h-[700px] overflow-y-auto">{visibleItems.map((item) => {
            const id = String(item.id);
            const order = selectedItemIds.indexOf(id) + 1;
            return <button key={id} type="button" onClick={() => toggleItem(id)} disabled={!order && selectedItemIds.length >= 12} aria-pressed={Boolean(order)} aria-label={`${order ? `Remove ${item.name}, selected ${order}` : `Add ${item.name}`} from email`} className={`relative text-left border p-2 disabled:opacity-40 ${order ? "border-[#E8500A] bg-[#E8500A]/10" : "border-white/10 hover:border-white/30"}`}>
              <span className="relative block aspect-[4/5] bg-[#222] overflow-hidden">{item.imageUrls?.[0] ? <img src={item.imageUrls[0]} alt="" className="w-full h-full object-cover" /> : <span className="flex h-full items-center justify-center text-[#666] text-xs">No photo</span>}{order > 0 && <span className="absolute top-2 left-2 flex items-center justify-center w-7 h-7 rounded-full bg-[#E8500A] text-white text-xs font-black">{order}</span>}</span>
              <span className="block text-xs font-bold mt-2 line-clamp-2">{item.name}</span><span className="block text-[10px] text-[#999] mt-1">{productSizeLabel(item)} · £{item.price.toFixed(2)}</span>
            </button>;
          })}{!visibleItems.length && <p className="col-span-2 text-[#777] text-xs py-5 text-center">No items match this filter.</p>}</div>}
        </div>
        <div className="bg-[#111] border border-white/8 p-5 space-y-3"><div><p className="text-[#F5C300] text-[9px] font-black tracking-[0.2em] uppercase mb-2">Checkout promotions</p><h3 className="font-black">Create a promo code</h3></div><label><span className={LABEL}>Code</span><input value={promo.code} onChange={(event) => setPromo({ ...promo, code: event.target.value.toUpperCase() })} placeholder="WEEKEND15" className={INPUT} /></label><div className="grid grid-cols-2 gap-3"><label><span className={LABEL}>Discount %</span><input type="number" min="1" max="100" value={promo.percentOff} onChange={(event) => setPromo({ ...promo, percentOff: Number(event.target.value) })} className={INPUT} /></label><label><span className={LABEL}>Maximum uses</span><input type="number" min="1" value={promo.maxRedemptions} onChange={(event) => setPromo({ ...promo, maxRedemptions: event.target.value })} placeholder="Unlimited" className={INPUT} /></label></div><label><span className={LABEL}>Expiry (optional)</span><input type="datetime-local" value={promo.expiresAt} onChange={(event) => setPromo({ ...promo, expiresAt: event.target.value })} className={INPUT} /></label><label><span className={LABEL}>Private note</span><input value={promo.description} onChange={(event) => setPromo({ ...promo, description: event.target.value })} placeholder="August newsletter" className={INPUT} /></label><button onClick={() => void createPromotion()} disabled={busy || promo.code.length < 4} className="w-full bg-[#F5C300] disabled:opacity-40 text-black py-3 text-xs font-black uppercase tracking-wider">Make code work at checkout</button>{promotions.length > 0 && <div className="border-t border-white/8 pt-3 space-y-2">{promotions.slice(0, 6).map((promotion) => <div key={promotion.code} className={`flex items-center justify-between gap-3 text-xs ${promotion.active ? "" : "opacity-45"}`}><div><span className={`font-bold ${promotion.active ? "text-[#F5C300]" : "text-[#999] line-through"}`}>{promotion.code} · {promotion.percent_off}%</span><span className="text-[#777] ml-2">{promotion.redemption_count}{promotion.max_redemptions ? `/${promotion.max_redemptions}` : ""} uses</span>{!promotion.active && <span className="block text-red-300 text-[9px] mt-1 uppercase tracking-wider">Cancelled</span>}</div>{promotion.active && <button onClick={() => void cancelPromotion(promotion)} disabled={busy} className="shrink-0 border border-red-500/30 text-red-300 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider hover:bg-red-500/10">Cancel</button>}</div>)}</div>}</div>
      </aside>
    </div>


  </section>;
}

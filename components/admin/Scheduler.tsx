"use client";

import { useMemo, useState } from "react";
import { releaseAtTime, ukDate } from "@/lib/listing-schedule";
import { productSizeLabel, type Product } from "@/lib/products";

export const GRID = "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5";
const dropDate = (at: string) => new Date(at).toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const ukTime = (at: string) => new Date(at).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function Tile({ product, onClick, label, note, pick }: { product: Product; onClick: () => void; label: string; note?: string; pick?: number }) {
  return <button type="button" onClick={onClick} aria-label={`${label}: ${product.name}`} aria-pressed={pick === undefined ? undefined : pick > 0} title={label} className={`relative min-w-0 text-left border p-1 ${pick ? "border-[#F5C300] bg-[#F5C300]/10" : "border-white/10 hover:border-[#F5C300]"}`}>
    {!!pick && <span className="absolute top-2 left-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#F5C300] px-1 text-[11px] font-black text-black">{pick}</span>}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <span className="block aspect-[3/4] bg-[#222] overflow-hidden">{product.imageUrls?.[0] ? <img src={product.imageUrls[0]} alt="" loading="lazy" className="w-full h-full object-cover" /> : <span className="flex h-full items-center justify-center text-[#666] text-[9px]">No photo</span>}</span>
    <span className="text-[10px] leading-tight font-bold mt-1 line-clamp-2 break-words">{product.name}</span>
    <span className="block truncate text-[9px] leading-tight text-[#999] mt-0.5">{productSizeLabel(product)} · £{product.price.toFixed(2)}</span>
    {note && <span className="block text-[9px] text-[#E8500A] mt-0.5">{note}</span>}
  </button>;
}

/** Everything waiting for a drop: drafts and finished hidden listings, in stock and not in a future drop. */
export function plannedItems(products: Product[], hiddenProductIds: string[], scheduledReleases: Record<string, string>, now: number): Product[] {
  return products.filter((product) => {
    const id = String(product.id);
    return product.stock > 0 && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) && !(Date.parse(scheduledReleases[id] ?? "") > now) && (product.listingStatus === "draft" || hiddenProductIds.includes(id));
  });
}

// The adjustable timer on a planned drop: edit its UK date and time, then save to move every item in it.
function DropTime({ at, now, busy, onSave }: { at: string; now: number; busy: boolean; onSave: (next: string) => void }) {
  const [date, setDate] = useState(ukDate(at));
  const [time, setTime] = useState(ukTime(at));
  const next = date && /^\d{2}:\d{2}$/.test(time) ? releaseAtTime(date, time) : "";
  const field = "bg-[#171717] border border-white/10 px-2 py-1.5 text-xs text-white outline-none focus:border-[#E8500A]/70";
  return <span className="flex flex-wrap items-center gap-1.5">
    <input type="date" aria-label="Drop date" min={ukDate(new Date(now))} value={date} onChange={(event) => setDate(event.target.value)} className={field} />
    <input type="time" aria-label="Drop time (UK)" value={time} onChange={(event) => setTime(event.target.value)} className={field} />
    <button type="button" disabled={busy || !next || next === at || Date.parse(next) <= now} onClick={() => onSave(next)} className="border border-[#F5C300]/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#F5C300] disabled:opacity-30">Save time</button>
  </span>;
}

export default function Scheduler({ products, hiddenProductIds, scheduledReleases, now, busy, message, updateSchedule, onEdit }: {
  products: Product[];
  hiddenProductIds: string[];
  scheduledReleases: Record<string, string>;
  now: number;
  busy: boolean;
  message: string;
  updateSchedule: (body: unknown, message: string) => Promise<void>;
  onEdit: (product: Product) => void;
}) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");

  const drops = useMemo(() => {
    const byDate = new Map<string, Product[]>();
    for (const product of products) {
      const at = scheduledReleases[String(product.id)];
      if (at && Date.parse(at) > now) byDate.set(at, [...(byDate.get(at) ?? []), product]);
    }
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([at, items]) => ({ at, items }));
  }, [products, scheduledReleases, now]);

  const query = search.trim().toLowerCase();
  const planned = plannedItems(products, hiddenProductIds, scheduledReleases, now);
  const shown = planned.filter((product) => !query || `${product.name} ${product.brand} ${product.sku ?? ""}`.toLowerCase().includes(query));
  const chosen = picked.map((id) => planned.find((product) => String(product.id) === id)).filter((product): product is Product => !!product);
  const at = date && /^\d{2}:\d{2}$/.test(time) ? releaseAtTime(date, time) : "";
  const existing = drops.findIndex((drop) => drop.at === at);
  const dropNumber = existing >= 0 ? existing + 1 : drops.filter((drop) => !at || drop.at < at).length + 1;

  const toggle = (product: Product) => {
    if (product.pricingStatus === "needs_review") return onEdit(product);
    const id = String(product.id);
    setPicked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const accept = async () => {
    if (busy || !chosen.length || !at || Date.parse(at) <= now) return;
    await updateSchedule({ schedule: { drop: chosen.map((product) => String(product.id)), at } }, `Drop ${dropNumber} saved: ${chosen.length} item${chosen.length === 1 ? "" : "s"} for ${dropDate(at)}`);
    setPicked([]);
  };

  return <section className="space-y-6">
    <div className="bg-[#111] border border-white/8 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4"><div><p className="text-[#E8500A] text-[9px] font-black tracking-[0.25em] uppercase mb-2">Scheduler</p><h2 className="text-xl font-black">Build a drop</h2><p className="text-[#777] text-xs mt-1">{planned.length} planned items, hidden and in stock. Tap photos to pick them in order, then set the date and time below. Edit opens the item in Listing studio.</p></div><input type="search" aria-label="Search planned items" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, brand or SKU…" className="w-full sm:max-w-xs bg-[#171717] border border-white/10 text-white text-sm px-3 py-2.5 outline-none focus:border-[#E8500A]/70 placeholder:text-[#444]" /></div>
      <div className={`${GRID} max-h-[700px] overflow-y-auto`}>{shown.map((product) => {
        const review = product.pricingStatus === "needs_review";
        return <div key={String(product.id)} className="min-w-0 flex flex-col">
          <Tile product={product} pick={picked.indexOf(String(product.id)) + 1} label={review ? "Price needs review: open in Listing studio" : "Pick for this drop"} note={review ? "Price needs review" : product.listingStatus === "draft" ? "Draft" : undefined} onClick={() => toggle(product)} />
          <button type="button" onClick={() => onEdit(product)} className="mt-1 border border-white/15 hover:border-[#F5C300] text-[9px] font-black uppercase tracking-wider py-1.5">Edit</button>
        </div>;
      })}{!shown.length && <p className="col-span-full text-[#777] text-xs py-5 text-center">Nothing waiting. Add a listing in Listing studio.</p>}</div>

      <div className="mt-5 border border-[#F5C300]/40 bg-[#F5C300]/[0.04] p-4">
        <p className="text-sm font-black"><span className="text-[#F5C300]">Drop {dropNumber}</span> · {chosen.length} picked{existing >= 0 ? " · adds to the drop already planned for this time" : ""}</p>
        {chosen.length ? <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">{chosen.map((product, index) => <li key={String(product.id)} className="flex min-w-0 items-center gap-2 border border-white/10 p-1.5">
          <span className="w-5 shrink-0 text-center text-xs font-black text-[#F5C300]">{index + 1}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="h-12 w-9 shrink-0 overflow-hidden bg-[#222]">{product.imageUrls?.[0] && <img src={product.imageUrls[0]} alt="" loading="lazy" className="h-full w-full object-cover" />}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{product.name}</span><span className="block truncate text-[10px] text-[#999]">{productSizeLabel(product)} · £{product.price.toFixed(2)}</span></span>
          <button type="button" onClick={() => toggle(product)} aria-label={`Take ${product.name} out of this drop`} className="shrink-0 px-2 py-1 text-[10px] font-black text-[#E8500A]">Remove</button>
        </li>)}</ol> : <p className="mt-2 text-xs text-[#777]">Tap photos above. They appear here as 1, 2, 3…</p>}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-[10px] font-black uppercase tracking-wider text-[#aaa]">Drop date<input type="date" min={ukDate(new Date(now))} value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block bg-[#171717] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-[#E8500A]/70" /></label>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#aaa]">Time (UK)<input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-1 block bg-[#171717] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-[#E8500A]/70" /></label>
          <button type="button" disabled={busy || !chosen.length || !at || Date.parse(at) <= now} onClick={() => void accept()} className="bg-[#E8500A] px-5 py-3 text-[11px] font-black uppercase tracking-wider disabled:opacity-40">Accept drop {dropNumber}</button>
          {!!chosen.length && <button type="button" onClick={() => setPicked([])} className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-[#aaa]">Clear picks</button>}
        </div>
        {!!at && Date.parse(at) <= now && <p role="alert" className="mt-2 text-xs text-[#E8500A]">That date and time has passed. Pick a later one.</p>}
        {chosen.some((product) => product.listingStatus === "draft") && <p className="mt-2 text-xs text-[#999]">Drafts in this drop count as checked by you when you accept. They stay hidden until the drop time.</p>}
      </div>
      {message && <p role="status" className="text-amber-200 text-xs mt-3">{message}</p>}
    </div>

    <div className="bg-[#111] border border-white/8 p-5 sm:p-6">
      <h2 className="text-xl font-black">Drops planned</h2><p className="text-[#777] text-xs mt-1">Each drop goes live by itself at its UK date and time. Change a drop&apos;s date or time and press Save time to move the whole drop.</p>
      <div className="mt-4 space-y-3">{drops.map((drop, index) => <div key={drop.at} className={`border p-3 ${drop.at === at ? "border-[#E8500A] bg-[#E8500A]/5" : "border-white/10"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2"><p className="text-sm font-black"><span className="text-[#F5C300]">Drop {index + 1}</span> · {dropDate(drop.at)} <span className="text-[10px] font-bold ml-2 text-[#999]">{drop.items.length} item{drop.items.length === 1 ? "" : "s"}</span></p><DropTime key={drop.at} at={drop.at} now={now} busy={busy} onSave={(next) => void updateSchedule({ schedule: { drop: drop.items.map((product) => String(product.id)), at: next } }, `Drop ${index + 1} moved to ${dropDate(next)}`)} /><button type="button" onClick={() => { setDate(ukDate(drop.at)); setTime(ukTime(drop.at)); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-pressed={drop.at === at} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border ${drop.at === at ? "bg-[#E8500A] border-[#E8500A]" : "border-white/15 text-[#aaa]"}`}>{drop.at === at ? "Adding to this drop" : "Add more to this drop"}</button></div>
        <div className={GRID}>{drop.items.map((product) => <div key={String(product.id)} className="min-w-0 flex flex-col">
          <Tile product={product} label="View item in Listing studio" onClick={() => onEdit(product)} />
          <div className="grid grid-cols-2 gap-1 mt-1">
            <button type="button" onClick={() => onEdit(product)} className="border border-white/15 hover:border-[#F5C300] text-[9px] font-black uppercase tracking-wider py-1.5">View item</button>
            <button type="button" disabled={busy} onClick={() => void updateSchedule({ schedule: { id: String(product.id) } }, "Removed from the drop; item stays hidden")} className="border border-[#E8500A]/50 text-[#E8500A] hover:bg-[#E8500A] hover:text-white disabled:opacity-40 text-[9px] font-black uppercase tracking-wider py-1.5">Remove from drop</button>
          </div>
        </div>)}</div>
      </div>)}{!drops.length && <p className="text-[#666] text-xs">No drops planned yet.</p>}</div>
    </div>

  </section>;
}

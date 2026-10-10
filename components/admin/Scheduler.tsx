"use client";

import { useMemo, useState } from "react";
import { upcomingSlots, type ScheduleConfig } from "@/lib/listing-schedule";
import { productSizeLabel, type Product } from "@/lib/products";

const GRID = "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5";
const dropDate = (at: string) => new Date(at).toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short" });

function Tile({ product, onClick, label, note }: { product: Product; onClick: () => void; label: string; note?: string }) {
  return <button type="button" onClick={onClick} aria-label={`${label}: ${product.name}`} title={label} className="min-w-0 text-left border border-white/10 hover:border-[#F5C300] p-1">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <span className="block aspect-[3/4] bg-[#222] overflow-hidden">{product.imageUrls?.[0] ? <img src={product.imageUrls[0]} alt="" loading="lazy" className="w-full h-full object-cover" /> : <span className="flex h-full items-center justify-center text-[#666] text-[9px]">No photo</span>}</span>
    <span className="text-[10px] leading-tight font-bold mt-1 line-clamp-2 break-words">{product.name}</span>
    <span className="block truncate text-[9px] leading-tight text-[#999] mt-0.5">{productSizeLabel(product)} · £{product.price.toFixed(2)}</span>
    {note && <span className="block text-[9px] text-[#E8500A] mt-0.5">{note}</span>}
  </button>;
}

export default function Scheduler({ products, hiddenProductIds, scheduledReleases, scheduleConfig, now, busy, message, updateSchedule, onEdit }: {
  products: Product[];
  hiddenProductIds: string[];
  scheduledReleases: Record<string, string>;
  scheduleConfig: ScheduleConfig;
  now: number;
  busy: boolean;
  message: string;
  updateSchedule: (body: unknown, message: string) => Promise<void>;
  onEdit: (product: Product) => void;
}) {
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState("");

  const drops = useMemo(() => {
    const byDate = new Map<string, Product[]>();
    for (const product of products) {
      const at = scheduledReleases[String(product.id)];
      if (at && Date.parse(at) > now) byDate.set(at, [...(byDate.get(at) ?? []), product]);
    }
    // Every drop that has items, plus the regular slots up to three empty ones past the last booked drop.
    const slots = upcomingSlots(scheduleConfig, now, 60);
    const last = Math.max(-1, ...[...byDate.keys()].map((at) => slots.indexOf(at)));
    const dates = [...new Set([...byDate.keys(), ...slots.slice(0, last + 4)])].sort();
    return dates.map((at) => ({ at, items: byDate.get(at) ?? [] }));
  }, [products, scheduledReleases, scheduleConfig, now]);

  const target = drops.some((drop) => drop.at === chosen) ? chosen : drops.find((drop) => drop.items.length < scheduleConfig.batchSize)?.at ?? "";
  const query = search.trim().toLowerCase();
  const matches = (product: Product) => !query || `${product.name} ${product.brand} ${product.sku ?? ""}`.toLowerCase().includes(query);
  const unscheduled = products.filter((product) => product.stock > 0 && !(Date.parse(scheduledReleases[String(product.id)] ?? "") > now) && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(product.id)) && matches(product));
  const ready = unscheduled.filter((product) => product.listingStatus !== "draft" && hiddenProductIds.includes(String(product.id)));
  const drafts = unscheduled.filter((product) => product.listingStatus === "draft");

  const add = (product: Product) => {
    if (busy || !target) return;
    if (product.pricingStatus === "needs_review") return onEdit(product);
    void updateSchedule({ schedule: { id: String(product.id), at: target } }, `Added to ${dropDate(target)}`);
  };

  return <section className="space-y-6">
    <div className="bg-[#111] border border-white/8 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-1"><div><p className="text-[#E8500A] text-[9px] font-black tracking-[0.25em] uppercase mb-2">Scheduler</p><h2 className="text-xl font-black">Upcoming drops</h2><p className="text-[#777] text-xs mt-1">{scheduleConfig.batchSize} items every {scheduleConfig.everyDays} days at {String(scheduleConfig.releaseHour).padStart(2, "0")}:00 UK. Pick a drop, then tap photos below to add them. Under each item in a drop: View item opens it in Listing studio, Remove from drop takes it out (it stays hidden).</p></div></div>
      {message && <p role="status" className="text-amber-200 text-xs mt-3">{message}</p>}
      <div className="mt-4 space-y-3">{drops.map((drop) => {
        const active = drop.at === target;
        return <div key={drop.at} className={`border p-3 ${active ? "border-[#E8500A] bg-[#E8500A]/5" : "border-white/10"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2"><p className="text-sm font-black">{dropDate(drop.at)} <span className={`text-[10px] font-bold ml-2 ${drop.items.length > scheduleConfig.batchSize ? "text-[#E8500A]" : "text-[#999]"}`}>{drop.items.length}/{scheduleConfig.batchSize}</span></p><button type="button" onClick={() => setChosen(drop.at)} aria-pressed={active} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border ${active ? "bg-[#E8500A] border-[#E8500A]" : "border-white/15 text-[#aaa]"}`}>{active ? "Adding to this drop" : "Add to this drop"}</button></div>
          {drop.items.length ? <div className={GRID}>{drop.items.map((product) => <div key={String(product.id)} className="min-w-0 flex flex-col">
            <Tile product={product} label="View item in Listing studio" onClick={() => onEdit(product)} />
            <div className="grid grid-cols-2 gap-1 mt-1">
              <button type="button" onClick={() => onEdit(product)} className="border border-white/15 hover:border-[#F5C300] text-[9px] font-black uppercase tracking-wider py-1.5">View item</button>
              <button type="button" disabled={busy} onClick={() => void updateSchedule({ schedule: { id: String(product.id) } }, "Removed from the drop; item stays hidden")} className="border border-[#E8500A]/50 text-[#E8500A] hover:bg-[#E8500A] hover:text-white disabled:opacity-40 text-[9px] font-black uppercase tracking-wider py-1.5">Remove from drop</button>
            </div>
          </div>)}</div> : <p className="text-[#666] text-xs">Empty.</p>}
        </div>;
      })}</div>
    </div>

    <div className="bg-[#111] border border-white/8 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4"><div><h2 className="text-xl font-black">Ready to schedule</h2><p className="text-[#777] text-xs mt-1">{ready.length} finished listings, hidden and in stock. Tap one to add it to {target ? dropDate(target) : "a drop"}.</p></div><input type="search" aria-label="Search items to schedule" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, brand or SKU…" className="w-full sm:max-w-xs bg-[#171717] border border-white/10 text-white text-sm px-3 py-2.5 outline-none focus:border-[#E8500A]/70 placeholder:text-[#444]" /></div>
      <div className={`${GRID} max-h-[700px] overflow-y-auto`}>{ready.map((product) => <Tile key={String(product.id)} product={product} label={product.pricingStatus === "needs_review" ? "Price needs review: open in Listing studio" : `Add to ${target ? dropDate(target) : "drop"}`} note={product.pricingStatus === "needs_review" ? "Price needs review" : undefined} onClick={() => add(product)} />)}{!ready.length && <p className="col-span-full text-[#777] text-xs py-5 text-center">Nothing waiting. Finish a draft below or add a listing in Listing studio.</p>}</div>
    </div>

    <div className="bg-[#111] border border-white/8 p-5 sm:p-6">
      <h2 className="text-xl font-black">Drafts to finish</h2><p className="text-[#777] text-xs mt-1 mb-4">{drafts.length} drafts. Tap one to open it in Listing studio, check it, then press Add to schedule there.</p>
      <div className={`${GRID} max-h-[700px] overflow-y-auto`}>{drafts.map((product) => <Tile key={String(product.id)} product={product} label="Open in Listing studio" onClick={() => onEdit(product)} />)}{!drafts.length && <p className="col-span-full text-[#777] text-xs py-5 text-center">No drafts.</p>}</div>
    </div>
  </section>;
}

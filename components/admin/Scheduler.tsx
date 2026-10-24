"use client";

import { useMemo, useState } from "react";
import { releaseAtTime, ukDate } from "@/lib/listing-schedule";
import { CATEGORIES, GENDERS, productSizeLabel, type Product } from "@/lib/products";

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

// The adjustable timer on a planned drop: edit its UK date, time and email switch, then save to apply to every item in it.
function DropTime({ at, quiet, now, busy, onSave }: { at: string; quiet: boolean; now: number; busy: boolean; onSave: (next: string, email: boolean) => void }) {
  const [date, setDate] = useState(ukDate(at));
  const [time, setTime] = useState(ukTime(at));
  const [email, setEmail] = useState(!quiet);
  const next = date && /^\d{2}:\d{2}$/.test(time) ? releaseAtTime(date, time) : "";
  const field = "bg-[#171717] border border-white/10 px-2 py-1.5 text-xs text-white outline-none focus:border-[#E8500A]/70";
  return <span className="flex flex-wrap items-center gap-1.5">
    <input type="date" aria-label="Drop date" min={ukDate(new Date(now))} value={date} onChange={(event) => setDate(event.target.value)} className={field} />
    <input type="time" aria-label="Drop time (UK)" value={time} onChange={(event) => setTime(event.target.value)} className={field} />
    <label className="flex items-center gap-1.5 px-1 text-[11px] text-[#ccc]"><input type="checkbox" checked={email} onChange={(event) => setEmail(event.target.checked)} className="accent-[#E8500A]" />Email subscribers</label>
    <button type="button" disabled={busy || !next || (next === at && email === !quiet) || Date.parse(next) <= now} onClick={() => onSave(next, email)} className="border border-[#F5C300]/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#F5C300] disabled:opacity-30">Save</button>
  </span>;
}

const chip = (on: boolean) => `px-3 py-1.5 text-[11px] font-bold border ${on ? "bg-[#E8500A] border-[#E8500A] text-white" : "border-white/15 text-[#bbb] hover:border-white/40"}`;
const added = (product: Product, now: number) => {
  const days = Math.max(0, Math.floor((now - Date.parse(product.listedDate)) / 86400000));
  return `Added ${new Date(product.listedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · ${days === 0 ? "today" : `${days}d ago`} · ${product.listingStatus === "draft" ? "Draft" : "Ready"}`;
};

// mode "plan": the Drop planner. mode "browse": the Drafts page, same filters, tapping a photo opens it in Listing studio.
// "" is the All chip: it clears the picks. Any other value is switched on or off.
const togglePick = (list: string[], value: string) => !value ? [] : list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

export default function Scheduler({ mode = "plan", products, hiddenProductIds, scheduledReleases, quietDrops, now, busy, message, updateSchedule, onEdit }: {
  mode?: "plan" | "browse";
  products: Product[];
  hiddenProductIds: string[];
  scheduledReleases: Record<string, string>;
  quietDrops: string[];
  now: number;
  busy: boolean;
  message: string;
  updateSchedule: (body: unknown, message: string) => Promise<void>;
  onEdit: (product: Product) => void;
}) {
  const [search, setSearch] = useState("");
  // Picked genders and types; empty means All. Tapping a chip toggles it, so several can be on at once.
  const [who, setWho] = useState<string[]>([]);
  const [type, setType] = useState<string[]>([]);
  // "all", or the brands picked; an empty pick list shows nothing until All or a brand is tapped.
  const [brand, setBrand] = useState<"all" | string[]>("all");
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<"type" | "brand" | "none">("type");
  // Newest first is the default; tapping the active sort again goes back to it.
  const [sort, setSort] = useState<"newest" | "oldest" | "high" | "low">("newest");
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("19:00");
  const [email, setEmail] = useState(true);

  const drops = useMemo(() => {
    const byDate = new Map<string, Product[]>();
    for (const product of products) {
      const at = scheduledReleases[String(product.id)];
      if (at && Date.parse(at) > now) byDate.set(at, [...(byDate.get(at) ?? []), product]);
    }
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([at, items]) => ({ at, items }));
  }, [products, scheduledReleases, now]);

  const planned = plannedItems(products, hiddenProductIds, scheduledReleases, now);
  const brands = [...planned.reduce((count, product) => count.set(product.brand, (count.get(product.brand) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  const types = CATEGORIES.filter((category) => planned.some((product) => product.category === category));
  const query = search.trim().toLowerCase();
  const shown = planned
    .filter((product) => (!query || `${product.name} ${product.brand} ${product.sku ?? ""}`.toLowerCase().includes(query)) && (!who.length || who.includes(product.gender)) && (!type.length || type.includes(product.category)) && (brand === "all" || brand.includes(product.brand)))
    .sort((a, b) => sort === "high" ? b.price - a.price : sort === "low" ? a.price - b.price : sort === "oldest" ? a.listedDate.localeCompare(b.listedDate) : b.listedDate.localeCompare(a.listedDate));
  const groups = groupBy === "none" ? [["All items", shown] as const] : [...shown.reduce((map, product) => {
    const key = groupBy === "type" ? product.category : product.brand;
    return map.set(key, [...(map.get(key) ?? []), product]);
  }, new Map<string, Product[]>())].sort((a, b) => b[1].length - a[1].length);

  const chosen = picked.map((id) => planned.find((product) => String(product.id) === id)).filter((product): product is Product => !!product);
  const at = date && /^\d{2}:\d{2}$/.test(time) ? releaseAtTime(date, time) : "";
  const existing = drops.findIndex((drop) => drop.at === at);
  const dropNumber = existing >= 0 ? existing + 1 : drops.filter((drop) => !at || drop.at < at).length + 1;

  const toggle = (product: Product) => {
    if (product.pricingStatus === "needs_review") return onEdit(product);
    const id = String(product.id);
    if (!picked.length) setOpen(true);
    setPicked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const accept = async () => {
    if (busy || !chosen.length || !at || Date.parse(at) <= now) return;
    await updateSchedule({ schedule: { drop: chosen.map((product) => String(product.id)), at, email } }, `Drop ${dropNumber} scheduled: ${chosen.length} item${chosen.length === 1 ? "" : "s"} for ${dropDate(at)}${email ? ", subscribers emailed at drop time" : ", no email"}`);
    setPicked([]);
    setOpen(false);
  };

  return <section className="space-y-6">
    <div className="bg-[#111] border border-white/8 p-5 sm:p-6">
      <p className="text-[#E8500A] text-[9px] font-black tracking-[0.25em] uppercase mb-2">{mode === "browse" ? "Drafts" : "Drop planner"}</p>
      <h2 className="text-xl font-black">{mode === "browse" ? "Items to be uploaded" : "Plan a drop"}</h2>
      {mode === "browse" ? <p className="text-[#777] text-xs mt-1">{planned.length} items uploaded and waiting, not public. Tap a photo to open it in Listing studio. Build drops on the Drop planner tab.</p> : <p className="text-[#777] text-xs mt-1">{planned.length} items uploaded and waiting, not public. Filter, tap photos to pick them in order, then set the date and time in the panel. Edit opens an item in Listing studio.</p>}
      {message && <p role="status" className="text-amber-200 text-xs mt-3">{message}</p>}
      <div className="mt-4 space-y-2">
        <input type="search" aria-label="Search waiting items" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, brand or SKU…" className="w-full bg-[#171717] border border-white/10 text-white text-sm px-3 py-2.5 outline-none focus:border-[#E8500A]/70 placeholder:text-[#555]" />
        <div className="flex flex-wrap items-center gap-1.5"><span className="w-12 text-[11px] text-[#777]">Who</span>{["", ...GENDERS].map((value) => <button key={value || "all"} type="button" aria-pressed={value ? who.includes(value) : !who.length} onClick={() => setWho(togglePick(who, value))} className={chip(value ? who.includes(value) : !who.length)}>{value === "" ? "All" : value === "Kids" ? "Children" : value}</button>)}</div>
        <div className="flex flex-wrap items-center gap-1.5"><span className="w-12 text-[11px] text-[#777]">Type</span>{["", ...types].map((value) => <button key={value || "all"} type="button" aria-pressed={value ? type.includes(value) : !type.length} onClick={() => setType(togglePick(type, value))} className={chip(value ? type.includes(value) : !type.length)}>{value || "All"}</button>)}</div>
        <div className="flex flex-wrap items-center gap-1.5"><span className="w-12 text-[11px] text-[#777]">Brand</span>
          {brand !== "all" && brand.length
            ? <button type="button" onClick={() => setBrand("all")} className={chip(false)}>Clear</button>
            : <button type="button" aria-expanded={brandsOpen} onClick={() => setBrandsOpen(!brandsOpen)} className={chip(brandsOpen)}>Brands {brandsOpen ? "▴" : "▾"}</button>}
          {brandsOpen && <>
            <button type="button" aria-pressed={brand === "all"} onClick={() => setBrand("all")} className={chip(brand === "all")}>All</button>
            {brands.map((value) => {
              const on = brand !== "all" && brand.includes(value);
              return <button key={value} type="button" aria-pressed={on} onClick={() => setBrand(brand === "all" ? [value] : on ? brand.filter((item) => item !== value) : [...brand, value])} className={chip(on)}>{value}</button>;
            })}
          </>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-[#777]">Group by {(["type", "brand", "none"] as const).map((value) => <button key={value} type="button" aria-pressed={groupBy === value} onClick={() => setGroupBy(value)} className={chip(groupBy === value)}>{value === "none" ? "None" : value === "type" ? "Type" : "Brand"}</button>)}<span className="ml-3">Sort</span>{(["newest", "oldest", "high", "low"] as const).map((value) => <button key={value} type="button" aria-pressed={sort === value} onClick={() => setSort(sort === value ? "newest" : value)} className={chip(sort === value)}>{{ newest: "Newest first", oldest: "Oldest first", high: "Highest price", low: "Lowest price" }[value]}</button>)}</div>
      </div>
      <div className="mt-5 space-y-5">{groups.map(([name, items]) => <div key={name}>
        <h3 className="text-sm font-black mb-2">{name} <span className="font-normal text-[#777]">{items.length}</span></h3>
        <div className={GRID}>{items.map((product) => {
          const review = product.pricingStatus === "needs_review";
          return <div key={String(product.id)} className="min-w-0 flex flex-col">
            {mode === "browse"
              ? <Tile product={product} label="Open in Listing studio" note={review ? "Price needs review" : added(product, now)} onClick={() => onEdit(product)} />
              : <>
                <Tile product={product} pick={picked.indexOf(String(product.id)) + 1} label={review ? "Price needs review: open in Listing studio" : "Pick for this drop"} note={review ? "Price needs review" : added(product, now)} onClick={() => toggle(product)} />
                <button type="button" onClick={() => onEdit(product)} className="mt-1 border border-white/15 hover:border-[#F5C300] text-[9px] font-black uppercase tracking-wider py-1.5">Edit</button>
              </>}
          </div>;
        })}</div>
      </div>)}{!shown.length && <p className="text-[#777] text-xs py-5 text-center">{!planned.length ? "Nothing waiting. Add a listing in Listing studio." : brand !== "all" && !brand.length ? "No brand picked. Tap All or a brand." : "Nothing matches these filters."}</p>}</div>
    </div>

    {mode === "plan" && <>
    <div className="bg-[#111] border border-white/8 p-5 sm:p-6">
      <h2 className="text-xl font-black">Drops planned</h2><p className="text-[#777] text-xs mt-1">Each drop goes live by itself at its UK date and time. Change the date, time or email switch and press Save to update the whole drop.</p>
      <div className="mt-4 space-y-3">{drops.map((drop, index) => <div key={drop.at} className="border border-white/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2"><p className="text-sm font-black"><span className="text-[#F5C300]">Drop {index + 1}</span> · {dropDate(drop.at)} <span className="text-[10px] font-bold ml-2 text-[#999]">{drop.items.length} item{drop.items.length === 1 ? "" : "s"} · {quietDrops.includes(drop.at) ? "no email" : "email on"}</span></p>
          <DropTime key={`${drop.at}-${quietDrops.includes(drop.at)}`} at={drop.at} quiet={quietDrops.includes(drop.at)} now={now} busy={busy} onSave={(next, nextEmail) => void updateSchedule({ schedule: { drop: drop.items.map((product) => String(product.id)), at: next, email: nextEmail } }, `Drop ${index + 1} saved for ${dropDate(next)}${nextEmail ? ", email on" : ", no email"}`)} />
          <button type="button" onClick={() => { setDate(ukDate(drop.at)); setTime(ukTime(drop.at)); setEmail(!quietDrops.includes(drop.at)); setOpen(true); }} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border border-white/15 text-[#aaa]">Add more to this drop</button></div>
        <div className={GRID}>{drop.items.map((product) => <div key={String(product.id)} className="min-w-0 flex flex-col">
          <Tile product={product} label="View item in Listing studio" onClick={() => onEdit(product)} />
          <div className="grid grid-cols-2 gap-1 mt-1">
            <button type="button" onClick={() => onEdit(product)} className="border border-white/15 hover:border-[#F5C300] text-[9px] font-black uppercase tracking-wider py-1.5">View item</button>
            <button type="button" disabled={busy} onClick={() => void updateSchedule({ schedule: { id: String(product.id) } }, "Removed from the drop; item is back in the planner")} className="border border-[#E8500A]/50 text-[#E8500A] hover:bg-[#E8500A] hover:text-white disabled:opacity-40 text-[9px] font-black uppercase tracking-wider py-1.5">Remove from drop</button>
          </div>
        </div>)}</div>
      </div>)}{!drops.length && <p className="text-[#666] text-xs">No drops planned yet.</p>}</div>
    </div>

    {!open && !!chosen.length && <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 bg-[#F5C300] text-black px-5 py-3 text-xs font-black uppercase tracking-wider shadow-[0_8px_30px_rgba(0,0,0,0.6)]">Drop {dropNumber} · {chosen.length} picked</button>}
    {open && <aside aria-label={`Drop ${dropNumber} builder`} className="fixed right-0 top-0 z-50 h-full w-full max-w-sm overflow-y-auto border-l-2 border-[#E8500A] bg-[#141414] p-5 shadow-[-20px_0_40px_rgba(0,0,0,0.6)]">
      <div className="flex items-start justify-between gap-3"><h2 className="text-2xl font-black text-[#F5C300]">Drop {dropNumber}</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close the drop panel" className="px-2 py-1 text-xl text-[#aaa]">×</button></div>
      <p className="text-[11px] text-[#888] mt-1">{chosen.length ? `${chosen.length} picked. Tap a photo again to take it out.` : "Tap photos to pick them. They appear here as 1, 2, 3…"}{existing >= 0 ? " Adds to the drop already planned for this time." : ""}</p>
      <ol className="mt-3 space-y-1.5">{chosen.map((product, index) => <li key={String(product.id)} className="flex min-w-0 items-center gap-2 border border-white/10 p-1.5">
        <span className="w-5 shrink-0 text-center text-xs font-black text-[#F5C300]">{index + 1}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className="h-12 w-9 shrink-0 overflow-hidden bg-[#222]">{product.imageUrls?.[0] && <img src={product.imageUrls[0]} alt="" loading="lazy" className="h-full w-full object-cover" />}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{product.name}</span><span className="block truncate text-[10px] text-[#999]">{productSizeLabel(product)} · £{product.price.toFixed(2)}</span></span>
        <button type="button" onClick={() => toggle(product)} aria-label={`Take ${product.name} out of this drop`} className="shrink-0 px-2 py-1 text-[10px] font-black text-[#E8500A]">Remove</button>
      </li>)}</ol>
      <label className="mt-4 block text-[10px] font-black uppercase tracking-wider text-[#aaa]">Drop date<input type="date" min={ukDate(new Date(now))} value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block w-full bg-[#1c1c1c] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-[#E8500A]/70" /></label>
      <label className="mt-3 block text-[10px] font-black uppercase tracking-wider text-[#aaa]">Time (UK)<input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-1 block w-full bg-[#1c1c1c] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-[#E8500A]/70" /></label>
      <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={email} onChange={(event) => setEmail(event.target.checked)} className="h-4 w-4 accent-[#E8500A]" />Email subscribers about this drop</label>
      <p className="text-[11px] text-[#888] mt-1">{email ? "The new-drop email goes to your list at drop time with these items." : "Goes live quietly. No email."}</p>
      {!!at && Date.parse(at) <= now && <p role="alert" className="mt-2 text-xs text-[#E8500A]">That date and time has passed. Pick a later one.</p>}
      {chosen.some((product) => product.listingStatus === "draft") && <p className="mt-2 text-[11px] text-[#999]">Drafts in this drop count as checked by you when you schedule. They stay hidden until the drop time.</p>}
      <button type="button" disabled={busy || !chosen.length || !at || Date.parse(at) <= now} onClick={() => void accept()} className="mt-4 w-full bg-[#E8500A] px-5 py-3 text-[11px] font-black uppercase tracking-wider disabled:opacity-40">Schedule drop {dropNumber}</button>
      {!!chosen.length && <button type="button" onClick={() => setPicked([])} className="mt-2 w-full px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#aaa]">Clear picks</button>}
    </aside>}
    </>}
  </section>;
}

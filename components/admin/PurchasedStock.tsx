"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/products";
import { taxYear } from "@/lib/sales";
import { uploadAdminPhoto } from "@/lib/photo-upload";

type Purchase = { id: string; source: "vinted" | "fleek" | "other"; external_id: string | null; title: string; seller: string; purchased_at: string; price: number; quantity: number; photo_url: string; personal: boolean; notes: string; invoice_path: string };

const INPUT = "w-full bg-[#171717] border border-white/10 text-white text-xs px-2 py-2 outline-none focus:border-[#E8500A]/70 placeholder:text-[#555]";
const SOURCE_NAME = { vinted: "Vinted", fleek: "Fleek", other: "Other" } as const;
const money = (value: number) => `£${Number(value).toFixed(2)}`;
const isDatabaseProduct = (product: Product) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(product.id));
// A listing matched to a purchase carries "[ref]" in its supplier field, so one bundle can feed many listings.
const purchaseTag = (purchase: Purchase) => `[${purchase.external_id ?? purchase.id}]`;

export default function PurchasedStock({ products, onProductsChanged }: { products: Product[]; onProductsChanged: () => void }) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [year, setYear] = useState(() => taxYear(new Date().toISOString()));
  const [show, setShow] = useState<"stock" | "unmatched" | "personal">("stock");
  const [busyId, setBusyId] = useState("");
  const [invoiceOpen, setInvoiceOpen] = useState<Purchase | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin-purchases");
    const data = await response.json();
    if (!response.ok) return setMessage(data.error ?? "Could not load purchases");
    setPurchases(data.purchases);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- first load from the API
  useEffect(() => { void load(); }, [load]);

  const save = async (purchase: Purchase, changes: Partial<Purchase>) => {
    const response = await fetch("/api/admin-purchases", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: purchase.id, ...changes }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? "Could not save"); return false; }
    setPurchases((current) => current.map((row) => (row.id === purchase.id ? data.purchase : row)));
    return true;
  };

  const addPhoto = async (purchase: Purchase, file: File | undefined) => {
    if (!file) return;
    setBusyId(purchase.id);
    setMessage(`Uploading photo for ${purchase.title}…`);
    try {
      if (await save(purchase, { photo_url: await uploadAdminPhoto(file) })) setMessage("Photo added");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Photo upload failed");
    } finally {
      setBusyId("");
    }
  };

  const addInvoice = async (purchase: Purchase, file: File | undefined) => {
    if (!file) return;
    setBusyId(purchase.id);
    setMessage(`Uploading invoice for ${purchase.title}…`);
    const body = new FormData();
    body.append("id", purchase.id);
    body.append("file", file);
    const response = await fetch("/api/admin-purchases/invoice", { method: "POST", body });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setPurchases((current) => current.map((row) => (row.id === purchase.id ? data.purchase : row)));
    setMessage(response.ok ? "Invoice added" : data.error ?? "Invoice upload failed");
    setBusyId("");
  };
  // Escape closes the invoice pop-up.
  useEffect(() => {
    if (!invoiceOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setInvoiceOpen(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [invoiceOpen]);

  // Matching copies the cost (per piece for bundles), tax year and supplier onto the listing, so its sale is taxed correctly.
  const match = async (purchase: Purchase, productName: string) => {
    const product = products.find((candidate) => candidate.name === productName && isDatabaseProduct(candidate));
    if (!product) return setMessage(productName ? `No listing called "${productName}"` : "");
    setBusyId(purchase.id);
    const { id, ...details } = product;
    const costPrice = Math.round((purchase.price / purchase.quantity) * 100) / 100;
    const source = `${SOURCE_NAME[purchase.source]}${purchase.seller ? ` ${purchase.seller}` : ""} ${purchaseTag(purchase)}`;
    const response = await fetch("/api/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, product: { ...details, costPrice, costTaxYear: taxYear(purchase.purchased_at), source } }) });
    setMessage(response.ok ? `Matched: ${product.name} now has cost ${money(costPrice)} (${taxYear(purchase.purchased_at)})` : "Could not update the listing");
    onProductsChanged();
    setBusyId("");
  };
  const matchedTo = (purchase: Purchase) => products.filter((product) => product.source?.includes(purchaseTag(purchase)));

  const years = useMemo(() => [...new Set(purchases.map((purchase) => taxYear(purchase.purchased_at)))].sort().reverse(), [purchases]);
  const totals = useMemo(() => years.map((label) => {
    const rows = purchases.filter((purchase) => !purchase.personal && taxYear(purchase.purchased_at) === label);
    return { label, pieces: rows.reduce((sum, row) => sum + row.quantity, 0), spend: rows.reduce((sum, row) => sum + Number(row.price), 0) };
  }), [purchases, years]);
  const visible = purchases.filter((purchase) => {
    if (show === "personal" ? !purchase.personal : purchase.personal) return false;
    if (show === "unmatched" && matchedTo(purchase).length >= purchase.quantity) return false;
    if (year && taxYear(purchase.purchased_at) !== year) return false;
    const query = search.trim().toLowerCase();
    return !query || `${purchase.title} ${purchase.seller} ${purchase.external_id ?? ""}`.toLowerCase().includes(query);
  });

  return (
    <section>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {totals.map((total) => <div key={total.label} className="bg-[#111] border border-white/8 p-5"><p className="text-[#888] text-[9px] uppercase tracking-[0.2em] mb-2">Stock bought {total.label}</p><p className="text-2xl font-black">{money(total.spend)}</p><p className="text-[#777] text-[10px] mt-1">{total.pieces} pieces · personal buys left out</p></div>)}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, seller or order number" className={`${INPUT} max-w-xs`} />
        <select value={year} onChange={(event) => setYear(event.target.value)} className={`${INPUT} max-w-[10rem]`}><option value="">All tax years</option>{years.map((label) => <option key={label} value={label}>{label}</option>)}</select>
        <select value={show} onChange={(event) => setShow(event.target.value as typeof show)} className={`${INPUT} max-w-[12rem]`}><option value="stock">Stock</option><option value="unmatched">Stock not matched yet</option><option value="personal">Personal buys</option></select>
      </div>
      {message && <p className="text-[#F5C300] text-xs mb-3">{message}</p>}
      <datalist id="purchase-match-products">{products.filter((product) => isDatabaseProduct(product)).map((product) => <option key={String(product.id)} value={product.name} />)}</datalist>
      <div className="bg-[#111] border border-white/8 divide-y divide-white/5">
        {visible.length === 0 && <p className="p-5 text-[#777] text-sm">No purchases to show.</p>}
        {visible.map((purchase) => (
          <div key={purchase.id} className="grid grid-cols-[4.5rem_1fr] md:grid-cols-[4.5rem_1fr_8rem_16rem_6rem] gap-3 items-center p-3">
            <label className="relative block w-[4.5rem] h-[4.5rem] bg-[#171717] border border-white/10 cursor-pointer overflow-hidden" title={purchase.photo_url ? "Change photo" : "Add photo"}>
              {purchase.photo_url
                // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail from storage
                ? <img src={purchase.photo_url} alt={purchase.title} className="w-full h-full object-cover" />
                : <span className="absolute inset-0 grid place-items-center text-[#666] text-[9px] uppercase text-center px-1">{busyId === purchase.id ? "Uploading…" : "Add photo"}</span>}
              <input type="file" accept="image/*" className="sr-only" disabled={busyId === purchase.id} onChange={(event) => void addPhoto(purchase, event.target.files?.[0])} />
            </label>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" title={purchase.title}>{purchase.title}{purchase.quantity > 1 && <span className="text-[#F5C300]"> × {purchase.quantity}</span>}</p>
              <p className="text-[#888] text-[10px] mt-0.5">{SOURCE_NAME[purchase.source]}{purchase.seller ? ` · ${purchase.seller}` : ""}{purchase.external_id ? ` · #${purchase.external_id}` : ""} · {new Date(purchase.purchased_at).toLocaleDateString("en-GB")} · {taxYear(purchase.purchased_at)}</p>
              {purchase.notes && <p className="text-[#666] text-[10px] mt-0.5">{purchase.notes}</p>}
              <div className="flex gap-3 mt-1 text-[10px] uppercase tracking-wider">
                {purchase.invoice_path && <button type="button" onClick={() => setInvoiceOpen(purchase)} className="text-[#E8500A] font-bold hover:underline">Invoice</button>}
                <label className="text-[#666] hover:text-white cursor-pointer">
                  {busyId === purchase.id ? "Uploading…" : purchase.invoice_path ? "Replace invoice" : "Add invoice"}
                  <input type="file" accept="application/pdf" className="sr-only" disabled={busyId === purchase.id} onChange={(event) => void addInvoice(purchase, event.target.files?.[0])} />
                </label>
              </div>
            </div>
            <div className="text-sm font-black">{money(purchase.price)}{purchase.quantity > 1 && <p className="text-[#888] text-[10px] font-normal">{purchase.quantity} pcs · {money(purchase.price / purchase.quantity)} each</p>}</div>
            <div>
              <input list="purchase-match-products" aria-label={`Match a listing to ${purchase.title}`} key={`${purchase.id}-${matchedTo(purchase).length}`} placeholder={purchase.quantity > 1 ? "Add a listing from this bundle…" : "Matched to my listing…"} disabled={busyId === purchase.id} onBlur={(event) => { const value = event.target.value.trim(); if (value) void match(purchase, value); }} className={INPUT} />
              {matchedTo(purchase).length > 0 && <p className="text-[#888] text-[10px] mt-1 truncate" title={matchedTo(purchase).map((product) => product.name).join("\n")}>Matched {matchedTo(purchase).length} of {purchase.quantity}: {matchedTo(purchase).map((product) => product.name).join(", ")}</p>}
            </div>
            <label className="flex items-center gap-2 text-[10px] text-[#888] uppercase"><input type="checkbox" checked={purchase.personal} onChange={(event) => void save(purchase, { personal: event.target.checked })} />Personal</label>
          </div>
        ))}
      </div>
      {invoiceOpen && (
        <div role="dialog" aria-modal="true" aria-label={`Invoice for ${invoiceOpen.title}`} className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center" onClick={() => setInvoiceOpen(null)}>
          <div className="bg-[#111] border border-white/10 w-full max-w-4xl h-[90vh] flex flex-col" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 p-3 border-b border-white/10">
              <p className="text-sm font-semibold truncate">Invoice · {invoiceOpen.title}</p>
              <button type="button" onClick={() => setInvoiceOpen(null)} className="text-xs uppercase tracking-wider text-[#888] hover:text-white">Close</button>
            </div>
            <iframe title={`Invoice for ${invoiceOpen.title}`} src={`/api/admin-purchases/invoice?id=${invoiceOpen.id}&v=${encodeURIComponent(invoiceOpen.invoice_path)}`} className="flex-1 w-full bg-white" />
          </div>
        </div>
      )}
    </section>
  );
}

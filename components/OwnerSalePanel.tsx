"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saleStage } from "@/lib/sales";

type PanelOrder = { id: string; item_id?: string; source: string; payment_status: string; fulfilment_status?: string; price: number | string; date_of_sale: string };

const INPUT = "w-full bg-[#171717] border border-white/15 px-3 py-2 text-white text-sm";
const STAGE_LABEL = { to_confirm: "Sold – to be confirmed", sold: "Sold – confirmed", other: "Refunded / returned" } as const;

// Rendered only for the signed-in owner (the product page checks the admin cookie on the server).
export default function OwnerSalePanel({ productId, price, costPrice, sold }: { productId: string; price: number; costPrice?: number; sold: boolean }) {
  const router = useRouter();
  const [bought, setBought] = useState(costPrice ? String(costPrice) : "");
  const [soldPrice, setSoldPrice] = useState(String(price));
  const [channel, setChannel] = useState<"vinted" | "other">("vinted");
  const [order, setOrder] = useState<PanelOrder | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sold) return;
    fetch("/api/admin-orders").then((response) => response.json()).then((data) => {
      const match = ((data.orders ?? []) as PanelOrder[]).find((row) => String(row.item_id ?? "").split(",").map((id) => id.trim()).includes(productId));
      setOrder(match ?? null);
      setLoaded(true);
    }).catch(() => setError("Could not load the sale"));
  }, [sold, productId]);

  const send = async (url: string, method: string, body: object) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (response.status === 401) throw new Error("Signed out: sign in to /admin again");
      if (!response.ok) throw new Error(data.error ?? "Something went wrong");
      return data;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const markSold = async () => {
    const data = await send("/api/admin-vinted-sale", "POST", { productId, purchasePrice: Number(bought), soldPrice: Number(soldPrice), channel });
    if (data) router.refresh();
  };

  const setStatus = async (fulfilment_status: "dispatched" | "delivered") => {
    if (!order) return;
    const data = await send("/api/admin-orders", "PATCH", { id: order.id, fulfilment_status });
    if (data?.order) setOrder(data.order);
  };

  return <div className="mt-5 border border-[#F5C300]/50 bg-[#F5C300]/5 p-4">
    <p className="text-[#F5C300] text-[10px] font-black uppercase tracking-[0.2em] mb-3">Owner only</p>
    {!sold && <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[#aaa] text-xs">Bought £<input type="number" min="0" step="0.01" value={bought} onChange={(event) => setBought(event.target.value)} className={INPUT} /></label>
        <label className="text-[#aaa] text-xs">Sold £<input type="number" min="0" step="0.01" value={soldPrice} onChange={(event) => setSoldPrice(event.target.value)} className={INPUT} /></label>
      </div>
      <label className="text-[#aaa] text-xs">Sold on<select value={channel} onChange={(event) => setChannel(event.target.value as "vinted" | "other")} className={INPUT}><option value="vinted">Vinted</option><option value="other">Other (in person, Depop…)</option></select></label>
      <button disabled={busy || bought === "" || !(Number(soldPrice) > 0)} onClick={() => void markSold()} className="min-h-11 bg-[#F5C300] text-[#0a0a0a] font-black text-xs uppercase tracking-wider disabled:opacity-40">Sold – to be confirmed</button>
    </div>}
    {sold && !order && !error && <p className="text-[#aaa] text-sm">{loaded ? "Sold, but no sale record found. Record it in /admin." : "Sold. Loading sale…"}</p>}
    {sold && order && <div className="grid gap-2">
      <p className="text-white text-sm font-bold">{STAGE_LABEL[saleStage(order)]} · {order.id} · £{Number(order.price).toFixed(2)}</p>
      {saleStage(order) === "to_confirm" && <div className="flex gap-2">
        {order.fulfilment_status !== "dispatched" && <button disabled={busy} onClick={() => void setStatus("dispatched")} className="min-h-11 flex-1 border border-white/20 text-white text-xs font-bold uppercase disabled:opacity-40">Posted</button>}
        <button disabled={busy} onClick={() => void setStatus("delivered")} className="min-h-11 flex-1 bg-[#F5C300] text-[#0a0a0a] text-xs font-black uppercase disabled:opacity-40">Confirm sold</button>
      </div>}
    </div>}
    {error && <p className="mt-2 text-[#ff8a5c] text-xs">{error}</p>}
  </div>;
}

"use client";

import { useState } from "react";

interface StatusOrder { id: string; item_name: string; total: number; date_of_sale: string; payment_status: string; fulfilment_status: string; tracking_number: string; dispatched_at?: string }

export default function OrderStatusForm() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<StatusOrder | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const lookup = async () => {
    setLoading(true); setMessage(""); setOrder(null);
    const response = await fetch("/api/order-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, email }) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) return setMessage(data.error ?? "Could not find that order");
    setOrder(data.order);
  };
  return <div className="bg-[#111] border border-white/10 p-5 sm:p-7">
    <label htmlFor="order-status-number" className="block text-[#aaa] text-[10px] font-black tracking-[0.18em] uppercase mb-2">Order number</label>
    <input id="order-status-number" name="orderNumber" autoComplete="off" value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="SR-XXXXXXXXXXXX" className="w-full bg-[#171717] border border-white/15 px-4 py-3 text-white mb-4 focus:border-[#E8500A] outline-none" />
    <label htmlFor="order-status-email" className="block text-[#aaa] text-[10px] font-black tracking-[0.18em] uppercase mb-2">Checkout email</label>
    <input id="order-status-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full bg-[#171717] border border-white/15 px-4 py-3 text-white mb-4 focus:border-[#E8500A] outline-none" />
    <button onClick={() => void lookup()} disabled={loading || !orderId || !email} className="w-full bg-[#E8500A] disabled:opacity-40 py-4 text-xs font-black tracking-[0.2em] uppercase">{loading ? "Checking…" : "Check order"}</button>
    {message && <p className="mt-4 text-red-300 text-sm">{message}</p>}
    {order && <div className="mt-6 border-t border-white/10 pt-5 space-y-2"><div className="flex justify-between gap-4"><strong>{order.item_name}</strong><strong className="text-[#E8500A]">£{Number(order.total).toFixed(2)}</strong></div><p className="text-[#aaa] text-sm">Order {order.id}</p><p className="text-white text-lg font-black capitalize">{(order.fulfilment_status || order.payment_status).replaceAll("_", " ")}</p>{order.tracking_number && <a href={`https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(order.tracking_number)}`} target="_blank" rel="noopener noreferrer" className="inline-block text-[#F5C300] text-sm font-bold">Track with Royal Mail →</a>}</div>}
  </div>;
}

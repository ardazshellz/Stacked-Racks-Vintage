"use client";

import { Suspense, useEffect, useId, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getCartIds, removeCartItem } from "@/lib/cart";
import type { Product } from "@/lib/products";
import { trackEvent } from "@/lib/analytics";
import { trackFirstParty } from "@/lib/first-party-analytics";
import { calculatePostage, FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";

function Field({ label, value, onChange, type = "text", placeholder = "", required = false, autoComplete }: {
  label: string; value: string; onChange: (value: string) => void; type?: string;
  placeholder?: string; required?: boolean; autoComplete?: string;
}) {
  const generatedId = useId();
  return <div><label htmlFor={generatedId} className="block text-[#aaa] text-[11px] tracking-[0.16em] uppercase mb-2">{label}{required && " *"}</label><input id={generatedId} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} autoComplete={autoComplete} className="w-full bg-[#1a1a1a] border border-white/15 text-white text-base sm:text-sm px-4 py-3.5 outline-none focus:border-[#E8500A] focus:ring-1 focus:ring-[#E8500A]/30 transition-colors placeholder:text-[#666]" /></div>;
}

function SummaryContent({ products, subtotal, discount, postage, total, cartMode, removeItem }: {
  products: Product[]; subtotal: number; discount: number; postage: number; total: number;
  cartMode: boolean; removeItem: (product: Product) => void;
}) {
  return <div className="p-5 sm:p-6">
    <div className="divide-y divide-white/8 border-b border-white/8 mb-5">{products.map((product) => <div key={product.id} className="flex gap-3 py-4 first:pt-0"><div className="relative w-16 h-16 bg-[#1a1a1a] border border-white/8 shrink-0 overflow-hidden">{product.imageUrls?.[0] ? <Image src={product.imageUrls[0]} alt="" fill sizes="64px" className="object-cover" /> : <span className="h-full flex items-center justify-center text-[#999] text-[10px]">ITEM</span>}</div><div className="min-w-0 flex-1"><p className="text-white text-sm font-bold leading-snug">{product.name}</p><p className="text-[#aaa] text-[11px] mt-1">{product.brand} · Size {product.size}</p>{cartMode && <button type="button" onClick={() => removeItem(product)} className="min-h-8 text-red-300 hover:text-red-200 text-[11px] mt-1 underline">Remove</button>}</div><p className="text-white text-sm font-bold">£{product.price.toFixed(2)}</p></div>)}</div>
    <div className="space-y-2.5 mb-5 text-sm"><div className="flex justify-between"><span className="text-[#bbb]">Items</span><span className="text-white font-bold">£{subtotal.toFixed(2)}</span></div>{discount > 0 && <div className="flex justify-between text-emerald-300"><span>Discount</span><span className="font-bold">−£{discount.toFixed(2)}</span></div>}<div className="flex justify-between"><span className="text-[#bbb]">UK tracked delivery</span><span className={`font-bold ${postage === 0 ? "text-emerald-300" : "text-white"}`}>{postage === 0 ? "FREE" : `£${postage.toFixed(2)}`}</span></div></div>
    <div className="border-t border-white/10 pt-4 flex justify-between items-center"><span className="text-white font-black">Total</span><span className="text-[#E8500A] font-black text-xl">£{total.toFixed(2)}</span></div>
    <div className="mt-5 pt-4 border-t border-white/8 space-y-1.5 text-[11px] text-[#999]"><p>✓ Dispatches within 24–48 hours</p><p>✓ Estimated UK delivery in 2–4 working days</p><p>✓ 14-day returns</p></div>
  </div>;
}

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const itemId = params.get("item");
  const cartMode = params.get("cart") === "true";
  const [products, setProducts] = useState<Product[] | undefined>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [promotionInput, setPromotionInput] = useState("");
  const [promotionApplied, setPromotionApplied] = useState(false);
  const [promotionPercent, setPromotionPercent] = useState(0);
  const [promotionError, setPromotionError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const ids = cartMode ? getCartIds() : itemId ? [itemId] : [];
    if (!ids.length) { Promise.resolve().then(() => active && setProducts([])); return () => { active = false; }; }
    fetch("/api/products", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error("Could not load products");
      const unavailable = new Set<string>([...(data.hiddenProductIds ?? []), ...(data.deletedProductIds ?? [])]);
      const all = (data.products ?? []) as Product[];
      const unique = all.filter((product, index) => all.findIndex((item) => String(item.id) === String(product.id)) === index && !unavailable.has(String(product.id)));
      const byId = new Map(unique.map((product) => [String(product.id), product]));
      if (active) setProducts(ids.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product)));
    }).catch(() => active && setProducts([]));
    return () => { active = false; };
  }, [cartMode, itemId]);

  const subtotal = products?.reduce((sum, product) => sum + product.price, 0) ?? 0;
  const discountedSubtotal = promotionApplied && products ? products.reduce((sum, product) => sum + Number((product.price * (1 - promotionPercent / 100)).toFixed(2)), 0) : subtotal;
  const discount = Number((subtotal - discountedSubtotal).toFixed(2));
  const postage = products?.length ? calculatePostage(subtotal) : 0;
  const total = discountedSubtotal + postage;
  const address = [addressLine.trim(), city.trim(), postcode.trim().toUpperCase()].filter(Boolean).join("\n");

  const removeItem = (product: Product) => { removeCartItem(product.id); setProducts((current) => current?.filter((item) => String(item.id) !== String(product.id))); };
  const applyPromotion = async () => {
    setPromotionError("");
    const response = await fetch("/api/validate-promotion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: promotionInput, email }) });
    const data = await response.json().catch(() => ({ valid: false }));
    const valid = Boolean(response.ok && data.valid);
    setPromotionApplied(valid);
    setPromotionPercent(valid ? Number(data.percentOff ?? 0) : 0);
    if (!response.ok || !data.valid) setPromotionError("That code is not recognised or has already been used.");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!products?.length) return;
    setLoading(true); setError("");
    try {
      trackEvent("begin_checkout", { value: total, currency: "GBP", items: products.length });
      trackFirstParty("checkout_started");
      const response = await fetch("/api/create-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemIds: products.map((product) => product.id), name, email, phone, address, promotionCode: promotionApplied ? promotionInput.trim().toUpperCase() : "" }) });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error ?? "Something went wrong — please try again.");
    } catch { setError("Network error — please check your connection and try again."); }
    finally { setLoading(false); }
  };

  if (products === undefined) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><p className="text-[#888]">Loading your items…</p></div>;
  if (!products.length) return <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 px-5 text-center"><p className="text-white font-bold text-xl">Your cart is empty.</p><p className="text-[#888] text-sm">Add an item from the shop, then return here to check out.</p><button onClick={() => router.push("/shop")} className="bg-[#E8500A] text-white font-black text-xs tracking-[0.16em] uppercase px-6 py-3">Browse the shop</button></div>;

  const summaryProps = { products, subtotal, discount, postage, total, cartMode, removeItem };
  return <div className="min-h-screen bg-[#0a0a0a]"><Navbar /><div className="mt-[92px] max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
    <button onClick={() => router.back()} className="text-[#888] text-xs tracking-widest uppercase hover:text-white mb-6">← Back</button>
    <details className="lg:hidden bg-[#111] border border-white/10 mb-7"><summary className="cursor-pointer list-none flex items-center justify-between gap-4 p-4"><span><span className="block text-[#E8500A] text-[11px] font-black tracking-[0.18em] uppercase">Order summary</span><span className="text-[#999] text-xs">{products.length} item{products.length === 1 ? "" : "s"} · {postage === 0 ? "Free delivery" : "UK tracked delivery"}</span></span><span className="text-white font-black text-lg">£{total.toFixed(2)}⌄</span></summary><SummaryContent {...summaryProps} /></details>
    <div className="grid lg:grid-cols-[1fr_420px] gap-10 items-start"><div><p className="text-[#E8500A] text-[11px] font-black tracking-[0.25em] uppercase mb-3">Secure checkout</p><h1 className="text-white text-2xl sm:text-3xl font-black tracking-wider mb-2" style={{ fontFamily: "var(--font-playfair-display), serif" }}>Delivery details</h1><p className="text-[#999] text-sm mb-7">We only use these details to fulfil your order.</p>
      <form onSubmit={handleSubmit} className="space-y-4"><Field label="Full name" value={name} onChange={setName} placeholder="John Smith" autoComplete="name" required /><Field label="Email" value={email} onChange={setEmail} type="email" placeholder="john@email.com" autoComplete="email" required /><Field label="Phone" value={phone} onChange={setPhone} type="tel" placeholder="+44 7700 900000" autoComplete="tel" required /><Field label="Address line" value={addressLine} onChange={setAddressLine} placeholder="12 Example Street" autoComplete="address-line1" required /><div className="grid sm:grid-cols-2 gap-4"><Field label="Town or city" value={city} onChange={setCity} placeholder="London" autoComplete="address-level2" required /><Field label="Postcode" value={postcode} onChange={setPostcode} placeholder="SW1A 1AA" autoComplete="postal-code" required /></div>
        <div className="border border-white/10 p-4"><label htmlFor="promotion-code" className="block text-[#bbb] text-[11px] tracking-[0.14em] uppercase mb-2">Discount code</label><div className="flex gap-2"><input id="promotion-code" value={promotionInput} onChange={(event) => { setPromotionInput(event.target.value); setPromotionApplied(false); setPromotionPercent(0); setPromotionError(""); }} placeholder="Enter code" className="min-w-0 flex-1 bg-[#1a1a1a] border border-white/15 text-white text-base px-4 py-3 outline-none focus:border-[#E8500A] uppercase" /><button type="button" onClick={() => void applyPromotion()} className="min-h-12 border border-white/20 text-white px-4 text-xs font-bold uppercase hover:border-[#E8500A]">Apply</button></div>{promotionApplied && <p className="text-emerald-300 text-xs mt-2">{promotionPercent}% discount applied — you save £{discount.toFixed(2)}.</p>}{promotionError && <p className="text-red-300 text-xs mt-2">{promotionError}</p>}</div>
        {subtotal < FREE_SHIPPING_THRESHOLD && <p className="text-[#F5C300] text-xs">Add £{(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2)} more for free UK delivery.</p>}{postage === 0 && <p className="text-emerald-300 text-xs font-bold">✓ Free UK tracked delivery applied</p>}{error && <p className="text-red-300 text-xs border border-red-500/30 bg-red-500/10 px-4 py-3" role="alert">{error}</p>}
        <button type="submit" disabled={loading || !name || !email || !phone || !addressLine || !city || !postcode} className="w-full bg-[#E8500A] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm tracking-[0.18em] uppercase py-4 hover:bg-[#c94009] transition-colors flex items-center justify-center gap-3">{loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Opening secure payment…</> : <>Continue to payment · £{total.toFixed(2)} →</>}</button><p className="text-[#777] text-[11px] text-center">Secure Stripe payment · Card details never touch our servers</p>
      </form></div><aside className="hidden lg:block bg-[#111] border border-white/10"><div className="flex justify-between p-6 pb-0"><p className="text-[#E8500A] text-[11px] font-black tracking-[0.2em] uppercase">Order summary</p><span className="text-[#888] text-xs">{products.length} item{products.length === 1 ? "" : "s"}</span></div><SummaryContent {...summaryProps} /></aside></div>
  </div></div>;
}

export default function CheckoutPage() { return <Suspense><CheckoutContent /></Suspense>; }

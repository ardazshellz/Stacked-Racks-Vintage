"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { products as staticProducts, type Product } from "@/lib/products";
import { getDynamicProducts } from "@/lib/dynamicProducts";
import { getCartIds, removeCartItem } from "@/lib/cart";
import Navbar from "@/components/Navbar";

const POSTAGE = 3.99;

function Field({
  label, value, onChange, type = "text", placeholder = "", required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <p className="text-[#555] text-[9px] tracking-[0.2em] uppercase mb-1.5">{label}{required && " *"}</p>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-[#1a1a1a] border border-white/10 text-white text-sm px-4 py-3 outline-none focus:border-[#E8500A]/60 transition-colors placeholder-[#333]"
      />
    </div>
  );
}

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const itemId = params.get("item");
  const cartMode = params.get("cart") === "true";

  const [products, setProducts] = useState<Product[] | undefined>(undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const ids = cartMode ? getCartIds() : itemId ? [itemId] : [];
    if (!ids.length) {
      Promise.resolve().then(() => active && setProducts([]));
      return () => { active = false; };
    }

    fetch("/api/products", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error("Could not load products");
        const unavailable = new Set<string>([...(data.hiddenProductIds ?? []), ...(data.deletedProductIds ?? [])]);
        const all = [...(data.products ?? []), ...getDynamicProducts(), ...staticProducts] as Product[];
        const unique = all.filter((product, index) =>
          all.findIndex((item) => String(item.id) === String(product.id)) === index &&
          !unavailable.has(String(product.id)),
        );
        const byId = new Map(unique.map((product) => [String(product.id), product]));
        if (active) setProducts(ids.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product)));
      })
      .catch(() => active && setProducts([]));
    return () => { active = false; };
  }, [cartMode, itemId]);

  const subtotal = products?.reduce((sum, product) => sum + product.price, 0) ?? 0;
  const total = subtotal + (products?.length ? POSTAGE : 0);

  const removeItem = (product: Product) => {
    removeCartItem(product.id);
    setProducts((current) => current?.filter((item) => String(item.id) !== String(product.id)));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!products?.length) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: products.map((product) => product.id),
          name, email, phone, address,
        }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error ?? "Something went wrong — please try again.");
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (products === undefined) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><p className="text-[#555]">Loading your items…</p></div>;
  }

  if (!products.length) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="text-white font-bold text-xl">Your cart is empty.</p>
        <p className="text-[#666] text-sm">Add an item from the shop, then come back here to pay for everything together.</p>
        <button onClick={() => router.push("/shop")} className="bg-[#E8500A] text-white font-black text-xs tracking-[0.16em] uppercase px-6 py-3">Browse the shop</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="mt-[92px] max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[#555] text-xs tracking-widest uppercase hover:text-[#aaa] transition-colors mb-8">← Back</button>

        <div className="grid lg:grid-cols-[1fr_420px] gap-10 items-start">
          <div>
            <p className="text-[#E8500A] text-[10px] font-black tracking-[0.3em] uppercase mb-3">Checkout</p>
            <h1 className="text-white text-2xl font-black tracking-wider mb-8" style={{ fontFamily: "var(--font-playfair-display), serif" }}>Your Details</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Full Name" value={name} onChange={setName} placeholder="John Smith" required />
              <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="john@email.com" required />
              <Field label="Phone" value={phone} onChange={setPhone} type="tel" placeholder="+44 7700 900000" required />
              <div>
                <p className="text-[#555] text-[9px] tracking-[0.2em] uppercase mb-1.5">Shipping Address *</p>
                <textarea value={address} onChange={(event) => setAddress(event.target.value)} placeholder={"12 Example Street\nLondon\nSW1A 1AA"} required rows={3} className="w-full bg-[#1a1a1a] border border-white/10 text-white text-sm px-4 py-3 outline-none focus:border-[#E8500A]/60 transition-colors placeholder-[#333] resize-none" />
              </div>
              {error && <p className="text-red-400 text-xs border border-red-500/30 bg-red-500/10 px-4 py-3">{error}</p>}
              <button type="submit" disabled={loading || !name || !email || !phone || !address} className="w-full bg-[#E8500A] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm tracking-[0.2em] uppercase py-4 hover:bg-[#c94009] transition-colors flex items-center justify-center gap-3 mt-2">
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Redirecting to Stripe…</> : <>Pay £{total.toFixed(2)} Securely →</>}
              </button>
              <p className="text-[#444] text-[10px] text-center tracking-wide">Secured by Stripe · SSL encrypted · No card details stored by us</p>
            </form>
          </div>

          <div className="bg-[#111] border border-white/8 p-6">
            <div className="flex items-center justify-between mb-5"><p className="text-[#E8500A] text-[9px] font-black tracking-[0.3em] uppercase">Order Summary</p><span className="text-[#666] text-xs">{products.length} item{products.length === 1 ? "" : "s"}</span></div>
            <div className="divide-y divide-white/8 border-b border-white/8 mb-5">
              {products.map((product) => (
                <div key={product.id} className="flex gap-4 py-4 first:pt-0">
                  <div className="w-16 h-16 bg-[#1a1a1a] border border-white/8 flex items-center justify-center shrink-0 overflow-hidden">{product.imageUrls?.[0] ? <img src={product.imageUrls[0]} alt="" className="w-full h-full object-cover" /> : <span className="text-[#333] text-[9px] uppercase">Item</span>}</div>
                  <div className="min-w-0 flex-1"><p className="text-white text-sm font-bold leading-snug">{product.name}</p><p className="text-[#555] text-[10px] mt-1">{product.brand} · Size {product.size}</p>{cartMode && <button type="button" onClick={() => removeItem(product)} className="text-red-400/70 hover:text-red-400 text-[10px] mt-2">Remove</button>}</div>
                  <p className="text-white text-sm font-bold">£{product.price.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 mb-5"><div className="flex justify-between text-sm"><span className="text-[#aaa]">Items</span><span className="text-white font-bold">£{subtotal.toFixed(2)}</span></div><div className="flex justify-between text-sm"><span className="text-[#aaa]">UK Postage (Royal Mail)</span><span className="text-white font-bold">£{POSTAGE.toFixed(2)}</span></div></div>
            <div className="border-t border-white/8 pt-4 flex justify-between items-center"><span className="text-white font-black tracking-wide">Total</span><span className="text-[#E8500A] font-black text-xl">£{total.toFixed(2)}</span></div>
            <p className="mt-5 pt-4 border-t border-white/5 text-[#444] text-[10px] leading-relaxed">One postage charge for the whole order. Ships within 24–48 hours via Royal Mail.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <Suspense><CheckoutContent /></Suspense>;
}

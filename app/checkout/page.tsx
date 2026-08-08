"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { products as staticProducts } from "@/lib/products";
import { getDynamicProducts } from "@/lib/dynamicProducts";
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
        onChange={(e) => onChange(e.target.value)}
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

  const [product, setProduct] = useState<ReturnType<typeof staticProducts.find>>(undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!itemId) return;
    const allProducts = [...getDynamicProducts(), ...staticProducts];
    const found = allProducts.find((p) => String(p.id) === itemId);
    setProduct(found);
  }, [itemId]);

  const total = (product?.price ?? 0) + POSTAGE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: product.id,
          itemName: product.name,
          itemBrand: product.brand,
          itemPrice: product.price,
          name, email, phone, address,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Something went wrong — please try again.");
      }
    } catch {
      setError("Network error — please check your connection and try again.");
    }
    setLoading(false);
  };

  if (!itemId || product === undefined) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-[#555]">Loading item…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <p className="text-white font-bold">Item not found.</p>
        <button onClick={() => router.push("/")} className="text-[#E8500A] text-sm underline">← Back to shop</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="mt-[92px] max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[#555] text-xs tracking-widest uppercase hover:text-[#aaa] transition-colors mb-8">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="grid lg:grid-cols-[1fr_420px] gap-10 items-start">

          {/* Form */}
          <div>
            <p className="text-[#E8500A] text-[10px] font-black tracking-[0.3em] uppercase mb-3">Checkout</p>
            <h1 className="text-white text-2xl font-black tracking-wider mb-8"
              style={{ fontFamily: "var(--font-playfair-display), serif" }}>
              Your Details
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Full Name" value={name} onChange={setName} placeholder="John Smith" required />
              <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="john@email.com" required />
              <Field label="Phone" value={phone} onChange={setPhone} type="tel" placeholder="+44 7700 900000" required />
              <div>
                <p className="text-[#555] text-[9px] tracking-[0.2em] uppercase mb-1.5">Shipping Address *</p>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={"12 Example Street\nLondon\nSW1A 1AA"}
                  required
                  rows={3}
                  className="w-full bg-[#1a1a1a] border border-white/10 text-white text-sm px-4 py-3 outline-none focus:border-[#E8500A]/60 transition-colors placeholder-[#333] resize-none"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs border border-red-500/30 bg-red-500/10 px-4 py-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !name || !email || !phone || !address}
                className="w-full bg-[#E8500A] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm tracking-[0.2em] uppercase py-4 hover:bg-[#c94009] transition-colors flex items-center justify-center gap-3 mt-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Redirecting to Stripe…</>
                ) : (
                  <>Pay £{total.toFixed(2)} Securely →</>
                )}
              </button>

              <p className="text-[#444] text-[10px] text-center tracking-wide">
                Secured by Stripe · SSL encrypted · No card details stored by us
              </p>
            </form>
          </div>

          {/* Order summary */}
          <div className="bg-[#111] border border-white/8 p-6">
            <p className="text-[#E8500A] text-[9px] font-black tracking-[0.3em] uppercase mb-5">Order Summary</p>

            <div className="flex gap-4 mb-5 pb-5 border-b border-white/8">
              <div className="w-16 h-16 bg-[#1a1a1a] border border-white/8 flex items-center justify-center shrink-0">
                <span className="text-[#333] text-[10px] uppercase tracking-widest">Item</span>
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-snug">{product.name}</p>
                <p className="text-[#555] text-[10px] mt-1">{product.brand} · {product.category} · Size {product.size}</p>
                <p className="text-[#555] text-[10px]">{product.era} · {product.condition}</p>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-[#aaa]">Item</span>
                <span className="text-white font-bold">£{product.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#aaa]">UK Postage (Royal Mail)</span>
                <span className="text-white font-bold">£{POSTAGE.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-white/8 pt-4 flex justify-between items-center">
              <span className="text-white font-black tracking-wide">Total</span>
              <span className="text-[#E8500A] font-black text-xl">£{total.toFixed(2)}</span>
            </div>

            <div className="mt-5 pt-4 border-t border-white/5">
              <p className="text-[#444] text-[10px] leading-relaxed">
                Ships within 24–48 hours via Royal Mail. UK delivery 2–3 working days. You'll receive tracking info by email.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import FreeShippingBar from "@/components/FreeShippingBar";
import Navbar from "@/components/Navbar";
import { getCartIds, removeCartItem } from "@/lib/cart";
import { productPath } from "@/lib/product-url";
import { productSizeLabel, websiteProductTitle, type Product } from "@/lib/products";
import { calculatePostage } from "@/lib/shipping";

const DISPLAY = { fontFamily: "var(--font-big-shoulders), Impact, sans-serif" };

export default function CartPage() {
  const [products, setProducts] = useState<Product[] | undefined>();

  useEffect(() => {
    let active = true;
    const ids = getCartIds();
    if (!ids.length) { Promise.resolve().then(() => active && setProducts([])); return () => { active = false; }; }
    fetch("/api/products", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error("Could not load products");
      const unavailable = new Set<string>([...(data.hiddenProductIds ?? []), ...(data.deletedProductIds ?? [])]);
      const byId = new Map(((data.products ?? []) as Product[]).filter((product) => !unavailable.has(String(product.id))).map((product) => [String(product.id), product]));
      if (active) setProducts(ids.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product)));
    }).catch(() => active && setProducts([]));
    return () => { active = false; };
  }, []);

  const remove = (product: Product) => { removeCartItem(product.id); setProducts((current) => current?.filter((item) => String(item.id) !== String(product.id))); };
  const subtotal = products?.reduce((sum, product) => sum + product.price, 0) ?? 0;
  const postage = calculatePostage(subtotal);

  return <main className="min-h-screen bg-[#0a0a0a]">
    <Navbar />
    <div className="mx-auto mt-[92px] max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <h1 className="mb-6 text-4xl font-black uppercase leading-none sm:text-5xl" style={DISPLAY}>Your cart</h1>
      {products === undefined ? <p className="text-[#888]">Loading your items…</p> : !products.length ? <div className="border border-white/10 bg-[#111] p-8 text-center"><p className="text-xl font-bold text-white">Your cart is empty.</p><p className="mt-2 text-sm text-[#888]">Add an item from the shop, then return here to check out.</p><Link href="/shop" className="mt-5 inline-flex min-h-12 items-center bg-[#E8500A] px-6 text-sm font-bold uppercase tracking-[0.1em] text-[#0a0a0a]">Browse the shop</Link></div> : <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ul className="divide-y divide-white/10 border-y border-white/10">{products.map((product) => <li key={product.id} className="flex gap-4 py-5">
          <Link href={productPath(product)} className="relative h-28 w-24 shrink-0 overflow-hidden border border-white/10 bg-[#1a1a1a]">{product.imageUrls?.[0] && <Image src={product.imageUrls[0]} alt="" fill sizes="96px" className="object-cover" />}</Link>
          <div className="min-w-0 flex-1">
            <Link href={productPath(product)} className="text-lg font-bold leading-snug text-white hover:text-[#F5C300]">{websiteProductTitle(product.name)}</Link>
            <p className="mt-1 text-sm text-[#c9c2b8]">{product.brand}, fits {productSizeLabel(product)}</p>
            <p className="mt-1 text-xs text-[#a39b90]">One-off piece</p>
            <button type="button" onClick={() => remove(product)} className="mt-2 min-h-10 text-sm text-red-300 underline underline-offset-4 hover:text-red-200" aria-label={`Remove ${product.name} from cart`}>Remove</button>
          </div>
          <p className="text-lg font-extrabold text-[#E8500A]" style={DISPLAY}>£{product.price.toFixed(2)}</p>
        </li>)}</ul>
        <aside className="space-y-5 border border-white/10 bg-[#111] p-5 sm:p-6 lg:sticky lg:top-28">
          <FreeShippingBar subtotal={subtotal} />
          <div className="space-y-2.5 border-t border-white/10 pt-5 text-sm">
            <div className="flex justify-between"><span className="text-[#bbb]">Items ({products.length})</span><span className="font-bold text-white">£{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-[#bbb]">UK tracked delivery</span><span className={`font-bold ${postage === 0 ? "text-emerald-300" : "text-white"}`}>{postage === 0 ? "FREE" : `£${postage.toFixed(2)}`}</span></div>
            <div className="flex items-center justify-between border-t border-white/10 pt-4"><span className="font-black text-white">Total</span><span className="text-2xl font-extrabold text-[#E8500A]" style={DISPLAY}>£{(subtotal + postage).toFixed(2)}</span></div>
          </div>
          <Link href="/checkout?cart=true" className="flex min-h-[52px] items-center justify-center bg-[#E8500A] text-base font-bold uppercase tracking-[0.08em] text-[#0a0a0a] transition-colors hover:bg-[#FF6A24]">Checkout</Link>
          <Link href="/shop" className="flex min-h-12 items-center justify-center text-sm text-[#a39b90] underline underline-offset-4 hover:text-white">Continue shopping</Link>
          <p className="text-center text-xs text-[#777]">Discount codes are entered at checkout.</p>
        </aside>
      </div>}
    </div>
    <Footer />
  </main>;
}

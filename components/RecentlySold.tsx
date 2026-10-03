"use client";

import type { Product } from "@/lib/products";
import ProductCard from "./ProductCard";

/** Sold pieces sit here as proof of sales, so the main grid only shows what can be bought. */
export default function RecentlySold({ products, onSelect }: { products: Product[]; onSelect: (product: Product) => void }) {
  const sold = products
    .filter((product) => product.stock <= 0)
    .sort((a, b) => new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime())
    .slice(0, 8);
  if (!sold.length) return null;

  return <section className="mt-12" aria-labelledby="recently-sold-heading">
    <h2 id="recently-sold-heading" className="mb-4 text-white text-2xl font-black uppercase tracking-wide" style={{ fontFamily: "var(--font-big-shoulders), Impact, sans-serif" }}>
      Recently <span className="text-[#E8500A]">sold</span>
    </h2>
    <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x">
      {sold.map((product) => <div key={product.id} className="w-40 sm:w-48 shrink-0 snap-start">
        <ProductCard product={product} onClick={() => onSelect(product)} />
      </div>)}
    </div>
  </section>;
}

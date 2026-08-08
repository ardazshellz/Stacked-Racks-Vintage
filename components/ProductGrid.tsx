"use client";

import { useRouter } from "next/navigation";
import { Product } from "@/lib/products";
import ProductCard from "./ProductCard";

const SECTION_LABELS: Record<string, string> = {
  "new-in": "New In",
  "rare": "Rare",
  "one-of-one": "1 of 1",
  "marquee": "Marquee Pieces",
};

interface Props {
  activeSection: string;
  products: Product[];
}

export default function ProductGrid({ activeSection, products }: Props) {
  const router = useRouter();

  const label = SECTION_LABELS[activeSection] ?? "Items";

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="text-white text-lg sm:text-xl font-black tracking-wider"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}
          >
            {label}
          </h2>
          <p className="text-[#555] text-xs mt-0.5">
            {products.length} item{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => router.push("/shop")}
          className="text-[#E8500A] text-xs font-bold tracking-widest uppercase hover:text-[#F5C300] transition-colors"
        >
          Browse All →
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-white/10">
          <p className="text-5xl mb-5 opacity-30">🔍</p>
          <p className="text-white font-bold text-lg mb-2">Nothing here yet</p>
          <p className="text-[#555] text-sm">Try a different section or clear your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => router.push(`/shop?item=${product.id}`)}
            />
          ))}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="mt-12 text-center border border-white/8 py-10 px-4">
        <p className="text-[#aaa] text-sm mb-1 tracking-wide">See the full collection</p>
        <p className="text-white font-bold text-base mb-6">Browse everything with filters</p>
        <button
          onClick={() => router.push("/shop")}
          className="inline-flex items-center gap-2 bg-[#E8500A] text-white font-black text-xs tracking-[0.2em] uppercase px-8 py-3.5 hover:bg-[#c94009] transition-colors mr-4"
        >
          BROWSE ALL ITEMS
        </button>
        <a
          href="https://www.vinted.co.uk/member/59714764-stackedracks"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-[#F5C300] text-[#F5C300] font-black text-xs tracking-[0.2em] uppercase px-8 py-3.5 hover:bg-[#F5C300]/10 transition-colors"
        >
          VIEW ON VINTED →
        </a>
      </div>
    </div>
  );
}

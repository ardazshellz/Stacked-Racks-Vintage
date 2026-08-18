"use client";

import { useState } from "react";
import { Product, productSizeLabel, websiteProductTitle } from "@/lib/products";
import ProductModal from "./ProductModal";
import Image from "next/image";

const ICONS: Record<string, string> = {
  Jackets: "🧥",
  Hoodies: "👕",
  "T-Shirts": "👕",
  Jerseys: "🏀",
  Knitwear: "🧶",
  Hats: "🧢",
};

interface Props {
  products: Product[];
  compact?: boolean;
}

export default function MarqueeGrid({ products, compact }: Props) {
  const [selected, setSelected] = useState<Product | null>(null);

  return (
    <>
      {/* Section header — hidden when used inside a sidebar layout */}
      {!compact && (
        <div className="bg-[#080808] pt-14 pb-8 px-4 sm:px-6 lg:px-8 border-b border-white/5">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-[#E8500A] text-[9px] font-black tracking-[0.4em] uppercase mb-4">
              ✦ Featured Selection ✦
            </p>
            <h2
              className="text-white text-3xl sm:text-4xl font-bold tracking-tight mb-3"
              style={{ fontFamily: "var(--font-playfair-display), serif" }}
            >
              Marquee Pieces
            </h2>
            <p className="text-[#999] text-sm tracking-widest uppercase">
              Standout vintage selected by Stacked Racks
            </p>
          </div>
        </div>
      )}

      {/* Gallery */}
      <div className={compact ? "" : "bg-[#080808] px-4 sm:px-6 lg:px-8 pb-16"}>
        <div className={compact ? "" : "max-w-5xl mx-auto"}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
            {products.map((product) => {
              const icon = ICONS[product.category] ?? "👕";
              const isSoldOut = product.stock === 0;

              return (
                <article
                  key={product.id}
                  onClick={() => !isSoldOut && setSelected(product)}
                  className={`group relative ${isSoldOut ? "cursor-default opacity-50" : "cursor-pointer"}`}
                >
                  {/* Large image area */}
                  <div className="aspect-[3/4] bg-[#0f0f0f] border border-white/8 group-hover:border-[#E8500A]/40 transition-all duration-500 flex items-center justify-center relative overflow-hidden">
                    {/* Icon placeholder */}
                    {product.imageUrls?.[0] ? (
                      <Image src={product.imageUrls[0]} alt={product.name} fill sizes={compact ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 100vw, 480px"} className="object-contain p-1.5 transition-transform duration-700 group-hover:scale-[1.02]" />
                    ) : <div className="text-center z-10">
                      <div className="text-7xl sm:text-8xl mb-4 opacity-30 group-hover:opacity-50 transition-opacity duration-500">
                        {icon}
                      </div>
                    </div>}

                    {/* Subtle vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    {/* Badge */}
                    <div className="absolute top-4 left-4 bg-[#E8500A] text-white text-[9px] font-black tracking-[0.2em] px-3 py-1.5">
                      MARQUEE
                    </div>

                    {/* Sold overlay */}
                    {isSoldOut && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
                        <span className="text-white/60 text-2xl font-black tracking-[0.3em] border-2 border-white/20 px-5 py-2 rotate-[-6deg]">
                          SOLD
                        </span>
                      </div>
                    )}

                    {/* Price overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 px-4 py-4">
                      <div className="flex items-end justify-between">
                        <span className="text-white/60 text-xs tracking-widest uppercase">{product.era} · {product.condition}</span>
                        <span className="text-[#E8500A] font-black text-2xl">£{product.price}</span>
                      </div>
                    </div>
                  </div>

                  {/* Editorial info */}
                  <div className="pt-5 pb-2">
                    <h3
                      className="text-white text-lg sm:text-xl font-bold mb-1 group-hover:text-[#E8500A] transition-colors duration-300"
                      style={{ fontFamily: "var(--font-playfair-display), serif" }}
                    >
                      {websiteProductTitle(product.name)}
                    </h3>
                    <p className="text-[#d2d2d2] text-sm font-semibold leading-snug tracking-wide mb-3">
                      {product.brand} · Fits {productSizeLabel(product)}
                    </p>

                    {/* Editorial story */}
                    {product.editorialStory && (
                      <p className="text-[#aaa]/70 text-sm leading-relaxed italic border-l-2 border-[#E8500A]/40 pl-4">
                        {product.editorialStory}
                      </p>
                    )}

                    {/* CTA */}
                    {!isSoldOut && (
                      <button className="mt-4 text-xs text-[#E8500A] font-bold tracking-[0.2em] uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
                        View Details
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Hover glow */}
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-none shadow-[inset_0_0_0_1px_rgba(232,80,10,0.2)]" />
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {products.length === 0 && (
        <div className="text-center py-16 border border-dashed border-white/10 mt-4">
          <p className="text-white font-bold mb-2">No items match</p>
          <p className="text-[#999] text-sm">Try clearing your filters</p>
        </div>
      )}

      {selected && (
        <ProductModal product={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

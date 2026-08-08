"use client";

import { useState } from "react";
import { Product, isNew } from "@/lib/products";
import SizeGuide from "./SizeGuide";

interface Props {
  product: Product;
  onClick: () => void;
}

const ICONS: Record<string, string> = {
  "Jackets": "🧥",
  "Hoodies": "👕",
  "T-Shirts & Tops": "👕",
  "Sweatshirts": "🧶",
  "Tracksuits": "🏃",
  "Joggers & Tracksuit Bottoms": "🏃",
  "Trousers": "👖",
  "Shorts": "🩳",
  "Football Shirts": "⚽",
  "Headwear": "🧢",
  "Bags & Backpacks": "🎒",
  "Swimwear": "🩱",
  "Shoes": "👟",
};

export default function ProductCard({ product, onClick }: Props) {
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const icon = ICONS[product.category] ?? "👕";

  const isSoldOut = product.stock === 0;
  const showMarqueeBadge = product.badge === "RARE";
  const showNewBadge = !showMarqueeBadge && isNew(product);
  const badgeLabel = showMarqueeBadge ? "MARQUEE" : "NEW";
  const badgeCls = showMarqueeBadge
    ? "bg-[#E8500A] text-white shadow-[0_0_10px_rgba(232,80,10,0.4)]"
    : "bg-[#F5C300] text-black";

  return (
    <>
      <article
        onClick={() => !isSoldOut && onClick()}
        className={`group relative bg-[#111] border border-white/8 transition-all duration-200 ${
          isSoldOut
            ? "opacity-55 cursor-default"
            : "cursor-pointer hover:border-[#E8500A] hover:-translate-y-1.5 hover:shadow-[0_8px_32px_rgba(232,80,10,0.2)]"
        }`}
        role={isSoldOut ? undefined : "button"}
        tabIndex={isSoldOut ? undefined : 0}
        onKeyDown={(e) => !isSoldOut && e.key === "Enter" && onClick()}
        aria-label={isSoldOut ? `${product.name} — sold out` : `View ${product.name}`}
      >
        {/* ── Image area ── */}
        <div className="aspect-[3/4] bg-[#161616] flex items-center justify-center relative overflow-hidden">
          {product.imageUrls?.[0] && (
            <img
              src={product.imageUrls[0]}
              alt={product.name}
              className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ${isSoldOut ? "grayscale" : "group-hover:scale-[1.03]"}`}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

          {!product.imageUrls?.[0] && <div className="text-center p-4 z-10">
            <div className={`text-4xl sm:text-5xl mb-3 transition-opacity duration-300 ${isSoldOut ? "opacity-20" : "opacity-50 group-hover:opacity-80"}`}>
              {icon}
            </div>
            <p className="text-[#2a2a2a] text-[10px] font-medium leading-tight px-2 group-hover:text-[#444] transition-colors">
              {product.name}
            </p>
          </div>}

          {/* Badge */}
          {(showMarqueeBadge || showNewBadge) && (
            <div className={`absolute top-2.5 left-2.5 text-[9px] sm:text-[10px] font-black tracking-[0.15em] px-2 py-1 ${badgeCls}`}>
              {badgeLabel}
            </div>
          )}

          {/* Sold-out stamp */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
              <span className="text-white/55 text-xl font-black tracking-[0.3em] border-2 border-white/25 px-4 py-1.5 rotate-[-8deg]">
                SOLD
              </span>
            </div>
          )}

          {/* Ships tag — in-stock items */}
          {!isSoldOut && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-emerald-400/80 text-[9px] font-bold tracking-wide uppercase">Ships 24hrs</span>
            </div>
          )}

          <div className="absolute inset-0 bg-[#E8500A]/0 group-hover:bg-[#E8500A]/3 transition-colors duration-300 pointer-events-none" />
        </div>

        {/* ── Info ── */}
        <div className="p-3 sm:p-4">
          <h3 className={`text-xs sm:text-sm font-semibold leading-snug mb-1.5 transition-colors duration-200 line-clamp-2 ${isSoldOut ? "text-white/40" : "text-white group-hover:text-[#E8500A]"}`}>
            {product.name}
          </h3>

          {/* Brand · Size */}
          <p className="text-[10px] tracking-wide mb-2">
            <span className={isSoldOut ? "text-[#444]" : "text-[#aaa] font-medium"}>
              {product.brand}
            </span>
            <span className="text-[#333] mx-1.5">·</span>
            <span className="text-[#555]">Size {product.size}</span>
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            {/* Size Guide link */}
            <button
              onClick={(e) => { e.stopPropagation(); setSizeGuideOpen(true); }}
              className="text-[#444] text-[9px] hover:text-[#aaa] underline underline-offset-2 tracking-wide transition-colors"
            >
              Size Guide
            </button>

            <span className={`font-black text-base sm:text-lg ${isSoldOut ? "text-[#444]" : "text-[#E8500A]"}`}>
              {isSoldOut ? "SOLD" : `£${product.price}`}
            </span>
          </div>
        </div>
      </article>

      {sizeGuideOpen && <SizeGuide onClose={() => setSizeGuideOpen(false)} />}
    </>
  );
}

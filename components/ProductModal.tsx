"use client";

import { useEffect, useCallback } from "react";
import { Product, isNew } from "@/lib/products";
import AddToCartButton from "./AddToCartButton";

interface Props {
  product: Product;
  onClose: () => void;
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

export default function ProductModal({ product, onClose }: Props) {
  const icon = ICONS[product.category] ?? "👕";
  const handleClose = useCallback(() => onClose(), [onClose]);

  const showBadge = product.badge === "RARE" || isNew(product);
  const badgeLabel = product.badge === "RARE" ? "MARQUEE" : "NEW";
  const badgeCls = product.badge === "RARE" ? "bg-[#E8500A] text-white" : "bg-[#F5C300] text-black";
  const descriptionLines = (product.editorialStory || product.description)
    .trim()
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .filter(Boolean);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
    };
  }, [handleClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      {/* ── Shell: mobile = bottom sheet, desktop = wide side-by-side card ── */}
      <div className="bg-[#111] border border-white/10 shadow-2xl w-full rounded-t-2xl sm:rounded-none relative
        /* mobile */  max-h-[92vh] overflow-y-auto
        /* desktop */ sm:max-w-[860px] sm:max-h-[88vh] sm:overflow-hidden sm:flex">

        {/* Close button — always top-right of whole modal */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 text-[#666] hover:text-white w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ════ LEFT: Image panel ════ */}
        <div className="
          /* mobile */  hidden
          /* desktop */ sm:flex sm:w-[44%] shrink-0 bg-[#161616] items-center justify-center relative">

          {/* Badge */}
          {showBadge && <div className={`absolute top-4 left-4 text-[10px] font-black tracking-[0.15em] px-2.5 py-1 ${badgeCls}`}>
            {badgeLabel}
          </div>}

          {product.imageUrls?.[0] ? (
            <img src={product.imageUrls[0]} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : <div className="text-center px-6">
            <div className="text-[6rem] mb-4 opacity-40">{icon}</div>
            <p className="text-[#2a2a2a] text-xs text-center leading-snug">{product.name}</p>
          </div>}
          <div
            className="absolute bottom-4 right-4 text-[#E8500A]/15 text-xs font-black tracking-widest"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}
          >SR</div>
        </div>

        {/* ════ RIGHT: Details panel ════ */}
        <div className="sm:flex-1 sm:overflow-y-auto flex flex-col">

          {/* Mobile-only top bar */}
          <div className="sm:hidden flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#111] z-10">
            <div className="flex items-center gap-3">
              {showBadge && <span className={`text-[10px] font-black tracking-[0.15em] px-2.5 py-1 ${badgeCls}`}>
                {badgeLabel}
              </span>}
              <span className="text-[#aaa] text-xs tracking-wider uppercase">
                {product.gender} · {product.category}
              </span>
            </div>
            {/* Close handled by global button top-right */}
            <div className="w-8 h-8" />
          </div>

          {/* Mobile-only image */}
          <div className="sm:hidden bg-[#161616] aspect-square flex items-center justify-center relative">
            {product.imageUrls?.[0] ? (
              <img src={product.imageUrls[0]} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : <div className="text-center">
              <div className="text-7xl mb-4 opacity-40">{icon}</div>
              <p className="text-[#2a2a2a] text-xs px-8 text-center">{product.name}</p>
            </div>}
          </div>

          {/* Details content */}
          <div className="p-5 sm:p-6 flex flex-col flex-1">

            {/* Desktop: category label */}
            <p className="hidden sm:block text-[#555] text-[9px] tracking-[0.25em] uppercase mb-3">
              {product.gender} · {product.category}
            </p>

            <h2
              className="text-white text-xl sm:text-2xl font-black mb-1 leading-tight"
              style={{ fontFamily: "var(--font-playfair-display), serif" }}
            >
              {product.name}
            </h2>

            <p className="text-[#aaa] text-sm mb-4">
              <span className="font-medium">{product.brand}</span>
              <span className="text-[#444] mx-2">·</span>
              Size {product.size}
            </p>

            <div className={product.editorialStory ? "border-l-2 border-[#E8500A]/50 pl-4 mb-4" : "mb-4"}>
              {descriptionLines.map((line, index) => (
                <p key={`${line}-${index}`} className={`${product.editorialStory ? "text-[#aaa]/80 italic" : "text-[#aaa]"} text-sm leading-relaxed mb-2 last:mb-0`}>{line}</p>
              ))}
            </div>

            {/* Specs */}
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {[
                { label: "Size",      value: product.size },
                { label: "Era",       value: product.era },
                { label: "Condition", value: product.condition },
                { label: "For",       value: product.gender },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#1a1a1a] border border-white/5 p-2 text-center">
                  <p className="text-[#444] text-[8px] uppercase tracking-[0.2em] mb-1">{label}</p>
                  <p className="text-white font-bold text-[10px] leading-tight">{value}</p>
                </div>
              ))}
            </div>

            {/* Stock */}
            {product.stock > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-emerald-400/70 text-xs tracking-wider">In stock · Ships within 24hrs</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center justify-between mb-5 mt-auto">
              <div>
                <span className="text-[#E8500A] font-black text-3xl">£{product.price}</span>
                <span className="text-[#444] text-xs ml-2">inc. VAT</span>
              </div>
              <div className="text-right">
                <p className="text-[#aaa] text-xs">Free UK shipping</p>
                <p className="text-[#444] text-[10px]">on orders over £50</p>
              </div>
            </div>

            {/* ── Purchase actions ── */}
            <div className="space-y-2">
              <AddToCartButton
                product={product}
                className="w-full bg-[#E8500A] text-white font-black text-xs tracking-[0.2em] uppercase py-4 hover:bg-[#c94009] transition-colors shadow-[0_4px_24px_rgba(232,80,10,0.35)]"
              />
              <a
                href={`/checkout?item=${product.id}`}
                className="flex items-center justify-center gap-2 w-full border border-[#E8500A]/60 text-[#E8500A] font-black text-xs tracking-[0.2em] uppercase py-3 hover:bg-[#E8500A]/10 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
                BUY THIS ITEM NOW
              </a>

              {/* Secondary: Vinted */}
              <a
                href="https://www.vinted.co.uk/member/59714764-stackedracks"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full border border-white/15 text-[#aaa] font-bold text-xs tracking-[0.2em] uppercase py-3 hover:border-white/30 hover:text-white transition-colors"
              >
                FIND ON VINTED
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>

            <p className="text-center text-[#333] text-[9px] mt-3 tracking-wide">
              Secure checkout · Have a discount code? Apply at checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

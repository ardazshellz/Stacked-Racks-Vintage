"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { displayGender, Product, isNew } from "@/lib/products";
import { productPath } from "@/lib/product-url";
import SizeGuide from "./SizeGuide";
import AddToCartButton from "./AddToCartButton";
import { trackFirstParty } from "@/lib/first-party-analytics";

interface Props { product: Product; onClick: () => void }

const ICONS: Record<string, string> = {
  Jackets: "🧥", Hoodies: "👕", "T-Shirts & Tops": "👕", Sweatshirts: "🧶",
  Tracksuits: "🏃", "Joggers & Tracksuit Bottoms": "🏃", Trousers: "👖",
  Shorts: "🩳", "Football Shirts": "⚽", Headwear: "🧢", "Bags & Backpacks": "🎒",
  Swimwear: "🩱", Shoes: "👟",
};

export default function ProductCard({ product, onClick }: Props) {
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const isSoldOut = product.stock === 0;
  const showMarqueeBadge = product.badge === "RARE";
  const showNewBadge = !showMarqueeBadge && isNew(product);
  const badgeLabel = showMarqueeBadge ? "MARQUEE" : "NEW";
  const badgeCls = showMarqueeBadge ? "bg-[#E8500A] text-white" : "bg-[#F5C300] text-black";
  const openProduct = () => {
    trackFirstParty("product_click", { productId: String(product.id), productName: product.name });
    onClick();
  };

  return <>
    <article className={`group relative bg-[#111] border border-white/10 transition-all duration-200 ${isSoldOut ? "opacity-55" : "hover:border-[#E8500A] hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(232,80,10,0.18)]"}`}>
      <button type="button" onClick={openProduct} disabled={isSoldOut} className="block w-full text-left disabled:cursor-default" aria-label={isSoldOut ? `${product.name} — sold out` : `View ${product.name}`}>
        <div className="aspect-[3/4] bg-[#161616] flex items-center justify-center relative overflow-hidden">
          {product.imageUrls?.[0] ? <Image src={product.imageUrls[0]} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw" className={`object-contain p-1.5 transition-transform duration-500 ${isSoldOut ? "grayscale" : "group-hover:scale-[1.02]"}`} /> : <div className="text-center p-4"><div className="text-4xl sm:text-5xl mb-3 opacity-45">{ICONS[product.category] ?? "👕"}</div><p className="text-[#999] text-xs">Photo coming soon</p></div>}
          {(showMarqueeBadge || showNewBadge) && <span className={`absolute top-2.5 left-2.5 text-[10px] font-black tracking-[0.12em] px-2 py-1 ${badgeCls}`}>{badgeLabel}</span>}
          {isSoldOut && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-white/70 text-xl font-black tracking-[0.25em] border-2 border-white/30 px-4 py-1.5 -rotate-6">SOLD</span></div>}
          {product.imageUrls && product.imageUrls.length > 1 && <span className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] px-2 py-1">{product.imageUrls.length} photos</span>}
        </div>
        <div className="p-3 sm:p-4 pb-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex border border-[#E8500A]/60 bg-[#E8500A]/10 px-2 py-1 text-[#E8500A] text-[9px] font-black tracking-[0.14em] uppercase">{displayGender(product.gender)}</span>
            <span className="min-w-0 truncate text-[#888] text-[9px] font-bold tracking-[0.12em] uppercase">{product.category}</span>
          </div>
          <h3 className={`text-sm font-semibold leading-snug mb-1.5 line-clamp-2 ${isSoldOut ? "text-white/50" : "text-white group-hover:text-[#E8500A]"}`}>{product.name}</h3>
          <p className="text-xs tracking-wide"><span className={isSoldOut ? "text-[#666]" : "text-[#bbb] font-medium"}>{product.brand}</span><span className="text-[#555] mx-1.5">·</span><span className="text-[#888]">Size {product.size}</span></p>
        </div>
      </button>

      <div className="px-3 sm:px-4 pb-3 sm:pb-4">
        <div className="flex items-center justify-between pt-2 border-t border-white/8">
          <button type="button" onClick={() => setSizeGuideOpen(true)} className="text-[#888] text-[11px] hover:text-white underline underline-offset-2 transition-colors">Size guide</button>
          <span className={`font-black text-lg ${isSoldOut ? "text-[#666]" : "text-[#E8500A]"}`}>{isSoldOut ? "SOLD" : `£${product.price.toFixed(2)}`}</span>
        </div>
        <Link href={productPath(product)} className="mt-2 min-h-8 flex items-center text-[#aaa] hover:text-white text-[11px] font-bold underline underline-offset-4">View full details</Link>
        {!isSoldOut && <AddToCartButton product={product} className="mt-3 w-full border border-[#E8500A]/60 text-[#E8500A] hover:bg-[#E8500A] hover:text-white py-2.5 text-[11px] font-black tracking-[0.14em] transition-colors" />}
      </div>
    </article>
    {sizeGuideOpen && <SizeGuide onClose={() => setSizeGuideOpen(false)} />}
  </>;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getVintedItemUrl, Product, isNew, productGenderLabel, productSizeLabel, websiteProductTitle } from "@/lib/products";
import { trackEvent } from "@/lib/analytics";
import { trackMetaEvent } from "@/lib/meta-pixel";
import { productPath } from "@/lib/product-url";
import { FREE_SHIPPING_THRESHOLD, qualifiesForFreeShipping } from "@/lib/shipping";
import AddToCartButton from "./AddToCartButton";

interface Props { product: Product; onClose: () => void }

const ICONS: Record<string, string> = {
  Jackets: "🧥", Hoodies: "👕", "T-Shirts & Tops": "👕", Sweatshirts: "🧶",
  Tracksuits: "🏃", "Joggers & Tracksuit Bottoms": "🏃", Trousers: "👖",
  Shorts: "🩳", "Football Shirts": "⚽", Headwear: "🧢", "Bags & Backpacks": "🎒",
  Swimwear: "🩱", Shoes: "👟",
};

export default function ProductModal({ product, onClose }: Props) {
  const images = product.imageUrls ?? [];
  const [activeImage, setActiveImage] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const desktopCloseButtonRef = useRef<HTMLButtonElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const handleClose = useCallback(() => onClose(), [onClose]);
  const icon = ICONS[product.category] ?? "👕";
  const showBadge = product.badge === "RARE" || isNew(product);
  const badgeLabel = product.badge === "RARE" ? "MARQUEE" : "NEW";
  const badgeCls = product.badge === "RARE" ? "bg-[#E8500A] text-white" : "bg-[#F5C300] text-black";
  const details = product.garmentDetails;
  const vintedItemUrl = getVintedItemUrl(product);
  const displayTitle = websiteProductTitle(product.name);
  const descriptionLines = (product.editorialStory || product.description || "")
    .trim().split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/).filter(Boolean);
  const measurements = [
    ["Pit to pit", details?.pitToPit], ["Length", details?.length], ["Sleeve", details?.sleeve],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const garmentFacts = [
    ["Colour", details?.colour], ["Material", details?.material], ["Flaws", details?.flaws],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  const previousImage = useCallback(() => setActiveImage((index) => (index - 1 + images.length) % images.length), [images.length]);
  const nextImage = useCallback(() => setActiveImage((index) => (index + 1) % images.length), [images.length]);

  useEffect(() => {
    trackEvent("view_item", { item_id: String(product.id), item_name: product.name, value: product.price, currency: "GBP" });
    trackMetaEvent("ViewContent", { content_ids: [String(product.id)], content_name: product.name, content_type: "product", value: product.price, currency: "GBP" });
  }, [product.id, product.name, product.price]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (zoomed) setZoomed(false);
        else handleClose();
      }
      if (images.length > 1 && event.key === "ArrowLeft") previousImage();
      if (images.length > 1 && event.key === "ArrowRight") nextImage();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (window.matchMedia("(min-width: 640px)").matches) desktopCloseButtonRef.current?.focus();
    else mobileCloseButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [handleClose, images.length, nextImage, previousImage, zoomed]);

  const renderGallery = (mobile = false) => (
    <div
      className={`${mobile ? "sm:hidden aspect-[4/5]" : "hidden sm:flex sm:w-[46%]"} shrink-0 bg-[#161616] items-center justify-center relative overflow-hidden touch-pan-y`}
      onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null || images.length < 2) return;
        const distance = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        if (Math.abs(distance) > 45) {
          if (distance < 0) nextImage();
          else previousImage();
        }
        touchStartX.current = null;
      }}
    >
      {showBadge && <div className={`absolute top-4 left-4 z-20 text-[11px] font-black tracking-[0.15em] px-2.5 py-1 ${badgeCls}`}>{badgeLabel}</div>}
      {images[activeImage] ? (
        <button type="button" onClick={() => setZoomed(true)} aria-label={`Zoom image ${activeImage + 1} of ${images.length}`} className="absolute inset-0 w-full h-full cursor-zoom-in">
          <Image src={images[activeImage]} alt={`${product.name} — photo ${activeImage + 1}`} fill sizes="(max-width: 640px) 100vw, 55vw" className="object-contain" priority={activeImage === 0} />
        </button>
      ) : (
        <div className="text-center px-6"><div className="text-[6rem] mb-4 opacity-40">{icon}</div><p className="text-[#555] text-sm">Photo coming soon</p></div>
      )}
      {images.length > 1 && <>
        <button type="button" onClick={previousImage} aria-label="Previous product photo" className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/70 border border-white/20 text-white text-xl">‹</button>
        <button type="button" onClick={nextImage} aria-label="Next product photo" className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/70 border border-white/20 text-white text-xl">›</button>
        <div className="absolute left-3 right-3 bottom-3 z-20 flex items-end justify-between gap-3">
          <div className="flex gap-1.5 overflow-x-auto">
            {images.map((image, index) => <button type="button" key={`${image}-${index}`} onClick={() => setActiveImage(index)} aria-label={`Show photo ${index + 1}`} className={`relative w-11 h-14 shrink-0 bg-black border ${index === activeImage ? "border-[#E8500A]" : "border-white/20"}`}><Image src={image} alt="" fill sizes="44px" className="object-cover" /></button>)}
          </div>
          <span className="shrink-0 bg-black/75 text-white text-[11px] px-2 py-1">{activeImage + 1}/{images.length}</span>
        </div>
      </>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-sm" onClick={(event) => event.target === event.currentTarget && handleClose()} role="dialog" aria-modal="true" aria-label={product.name}>
      <div className="bg-[#111] border border-white/10 shadow-2xl w-full rounded-t-2xl sm:rounded-none relative max-h-[94vh] overflow-y-auto sm:max-w-[980px] sm:max-h-[90vh] sm:overflow-hidden sm:flex">
        <button ref={desktopCloseButtonRef} onClick={handleClose} className="hidden sm:flex absolute top-3 right-3 z-30 bg-black/65 border border-white/15 text-white w-10 h-10 items-center justify-center hover:bg-black hover:border-white/35 transition-colors" aria-label="Close product details">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {renderGallery()}
        <div className="sm:flex-1 sm:overflow-y-auto flex flex-col">
          <button ref={mobileCloseButtonRef} type="button" onClick={handleClose} className="sm:hidden w-full flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10 sticky top-0 bg-[#111] z-30 min-h-16 text-left" aria-label="Close product details">
            <span className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 border border-[#E8500A]/60 bg-[#E8500A]/10 px-2.5 py-1.5 text-[#E8500A] text-[10px] font-black tracking-[0.14em] uppercase">{productGenderLabel(product)}</span>
              <span className="truncate text-[#aaa] text-[10px] font-bold tracking-[0.14em] uppercase">{product.category}</span>
            </span>
            <span aria-hidden="true" className="w-8 h-8 shrink-0 rounded-full border border-white/20 bg-black/35 text-white text-xl leading-none flex items-center justify-center">×</span>
          </button>
          {renderGallery(true)}

          <div className="p-5 sm:p-7 flex flex-col flex-1">
            <div className="hidden sm:flex items-center gap-2 mb-3">
              <span className="border border-[#E8500A]/60 bg-[#E8500A]/10 px-2.5 py-1.5 text-[#E8500A] text-[10px] font-black tracking-[0.14em] uppercase">{productGenderLabel(product)}</span>
              <span className="text-[#888] text-[10px] font-bold tracking-[0.16em] uppercase">{product.category}</span>
            </div>
            {vintedItemUrl ? <a href={vintedItemUrl} target="_blank" rel="noopener noreferrer" className="block text-white hover:text-[#F5C300] transition-colors" aria-label={`View ${product.name} on Vinted`}><h2 className="text-xl sm:text-2xl font-black mb-1 leading-tight" style={{ fontFamily: "var(--font-playfair-display), serif" }}>{displayTitle}</h2></a> : <h2 className="text-white text-xl sm:text-2xl font-black mb-1 leading-tight" style={{ fontFamily: "var(--font-playfair-display), serif" }}>{displayTitle}</h2>}
            <p className="text-[#d2d2d2] text-[15px] sm:text-base font-semibold leading-snug mb-5"><span>{product.brand}</span><span className="text-[#777] mx-2">·</span>Fits {productSizeLabel(product)}</p>

            {!!descriptionLines.length && <div className={product.editorialStory ? "border-l-2 border-[#E8500A]/50 pl-4 mb-5" : "mb-5"}>{descriptionLines.map((line, index) => <p key={`${line}-${index}`} className={`${product.editorialStory ? "text-[#bbb] italic" : "text-[#bbb]"} text-sm leading-relaxed mb-2 last:mb-0`}>{line}</p>)}</div>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-5">
              {[["Size", productSizeLabel(product)], ["Era", product.era], ["Condition", product.condition], ["Fit", product.fit]].map(([label, value]) => <div key={label} className="bg-[#1a1a1a] border border-white/8 p-2.5 text-center"><p className="text-[#888] text-[10px] uppercase tracking-[0.14em] mb-1">{label}</p><p className="text-white font-bold text-xs leading-tight">{value}</p></div>)}
            </div>

            {!!measurements.length && <div className="mb-5 border border-white/10 p-4"><div className="flex items-center justify-between mb-3"><p className="text-white text-xs font-black tracking-[0.16em] uppercase">Measurements</p><span className="text-[#777] text-[11px]">Measured flat</span></div><div className="grid grid-cols-3 gap-2">{measurements.map(([label, value]) => <div key={label}><p className="text-[#777] text-[10px] uppercase mb-1">{label}</p><p className="text-white text-sm font-bold">{value}</p></div>)}</div></div>}

            {!!garmentFacts.length && <dl className="mb-5 divide-y divide-white/8 border-y border-white/8">{garmentFacts.map(([label, value]) => <div key={label} className="grid grid-cols-[90px_1fr] gap-3 py-2.5 text-sm"><dt className="text-[#777]">{label}</dt><dd className="text-[#ccc]">{value}</dd></div>)}</dl>}

            <div className="bg-emerald-500/[0.06] border border-emerald-500/20 p-3 mb-5 space-y-1.5 text-xs">
              <p className="text-emerald-300 font-bold">● In stock · Dispatches within 24–48 hours</p>
              <p className="text-[#bbb]">Estimated UK delivery in 2–4 working days</p>
              <p className="text-[#bbb]">14-day returns · <Link href="/legal" className="underline text-white">View returns policy</Link></p>
            </div>

            <div className="flex items-center justify-between mb-5 mt-auto"><span className="text-[#E8500A] font-black text-3xl">£{product.price.toFixed(2)}</span><div className="text-right">{qualifiesForFreeShipping(product.price) ? <><p className="text-emerald-300 text-xs font-bold">Free UK shipping</p><p className="text-[#777] text-[11px]">applied at checkout</p></> : <><p className="text-[#bbb] text-xs">£{(FREE_SHIPPING_THRESHOLD - product.price).toFixed(2)} from free shipping</p><p className="text-[#777] text-[11px]">UK orders over £{FREE_SHIPPING_THRESHOLD}</p></>}</div></div>

            <div className="sticky bottom-0 z-10 bg-[#111] border-t border-white/10 pt-3 pb-1 space-y-2">
              <AddToCartButton product={product} className="w-full bg-[#E8500A] text-white font-black text-xs tracking-[0.2em] uppercase py-4 hover:bg-[#c94009] transition-colors shadow-[0_4px_24px_rgba(232,80,10,0.3)]" />
              <a href={`/checkout?item=${product.id}`} className="flex items-center justify-center w-full border border-[#E8500A]/60 text-[#E8500A] font-black text-xs tracking-[0.18em] uppercase py-3 hover:bg-[#E8500A]/10 transition-colors">BUY THIS ITEM NOW</a>
              <Link href={productPath(product)} className="flex items-center justify-center w-full text-white/80 font-bold text-[11px] tracking-[0.15em] uppercase py-2 hover:text-white transition-colors">Open full product page →</Link>
              <a href={vintedItemUrl ?? "https://www.vinted.co.uk/member/59714764-stackedracks"} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full text-[#888] font-bold text-[11px] tracking-[0.15em] uppercase py-2 hover:text-white transition-colors">{vintedItemUrl ? "View this item on Vinted ↗" : "View our Vinted shop ↗"}</a>
            </div>
            <p className="text-center text-[#777] text-[11px] mt-3">Secure Stripe checkout · Cards, Apple Pay and Google Pay where available</p>
          </div>
        </div>
      </div>

      {zoomed && images[activeImage] && <div className="fixed inset-0 z-[90] bg-black/95 p-4 sm:p-10 flex items-center justify-center" onClick={() => setZoomed(false)} role="dialog" aria-label="Enlarged product photo"><div className="relative w-full h-full"><Image src={images[activeImage]} alt={`${product.name} enlarged`} fill sizes="100vw" className="object-contain" /></div><button type="button" onClick={() => setZoomed(false)} className="absolute top-4 right-4 w-11 h-11 bg-white text-black text-xl" aria-label="Close enlarged photo">×</button></div>}
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { type Product, railPicks, productSizeLabel, websiteProductTitle } from "@/lib/products";
import { productPath } from "@/lib/product-url";
import AddToCartButton from "./AddToCartButton";

function Hanger({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 34" aria-hidden="true" className={className}>
      <path d="M30 14V8a5 5 0 1 1 5-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M30 14 4 31h52Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

/** Newest pieces hung on a rail; picking one opens it up close, like browsing a real rack. */
export default function OnTheRail({ products, onSelect }: { products: Product[]; onSelect: (product: Product) => void }) {
  const rail = railPicks(products);
  const [active, setActive] = useState<number | null>(null);
  const [photo, setPhoto] = useState(0);
  if (rail.length < 3) return null;

  const open = (i: number) => { setActive((i + rail.length) % rail.length); setPhoto(0); };
  const item = active === null ? null : rail[active];
  const prev = active === null ? null : rail[(active - 1 + rail.length) % rail.length];
  const next = active === null ? null : rail[(active + 1) % rail.length];
  const photos = item?.imageUrls?.slice(0, 4) ?? [];

  return (
    <section
      aria-labelledby="on-the-rail-heading"
      className="relative overflow-hidden border-t border-white/5 bg-[radial-gradient(60%_60%_at_50%_0%,#2a1608_0%,#0a0a0a_70%)] py-12 sm:py-16"
      onKeyDown={(e) => {
        if (active === null) return;
        if (e.key === "ArrowLeft") open(active - 1);
        if (e.key === "ArrowRight") open(active + 1);
        if (e.key === "Escape") setActive(null);
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="on-the-rail-heading" className="font-display text-white text-4xl sm:text-5xl font-extrabold uppercase leading-[0.9]">
          Fresh off the rack
        </h2>
        <p className="mt-2 text-sm text-[#aaa]">
          {item ? "Use the arrows to move along the rail." : "Our newest pieces, hung up. Pick one to see it up close."}
        </p>
      </div>

      {item && prev && next ? (
        <div key={item.id} className="rail-focus-in mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-8">
            <button type="button" onClick={() => open(active! - 1)} aria-label={`Previous: ${websiteProductTitle(prev.name)}`} className="group flex items-center justify-end gap-6">
              <span className="relative hidden aspect-[3/4] w-32 opacity-40 blur-[5px] transition group-hover:opacity-70 group-hover:blur-[2px] lg:block">
                <Image src={prev.imageUrls![0]} alt="" fill sizes="128px" className="object-cover" />
              </span>
              <span className="grid h-11 w-11 place-items-center rounded-full border border-white/30 text-white transition-colors group-hover:border-[#E8500A] group-hover:text-[#E8500A]">←</span>
            </button>

            <div className="flex flex-col items-center">
              <div className="h-1.5 w-[min(64vw,340px)] rounded-full bg-gradient-to-b from-[#ffd9b8] via-[#E8500A] to-[#6b2504] shadow-[0_3px_8px_rgba(0,0,0,.6)]" />
              <Hanger className="-mt-0.5 h-7 w-12 text-[#bbb]" />
              <div className="relative -mt-1 w-[min(56vw,300px)]">
                <button type="button" onClick={() => setPhoto((photo + 1) % photos.length)} aria-label="Next photo" className="relative block aspect-[3/4] w-full shadow-[0_18px_40px_rgba(0,0,0,.7)]">
                  <Image src={photos[photo]} alt={item.name} fill sizes="300px" className="object-cover" priority />
                </button>
                <div className="rail-tag pointer-events-none absolute -right-4 top-6 w-16 rounded-sm bg-[#F5C300] px-1.5 pb-2 pt-3 text-center text-[#0a0a0a] shadow-[0_6px_10px_rgba(0,0,0,.5)] sm:-right-6">
                  <span className="absolute left-1/2 top-1 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#0a0a0a]" />
                  <span className="block font-plexmono text-[10px] uppercase leading-tight">Size {item.size}</span>
                  <span className="block font-display text-2xl font-extrabold leading-none">£{item.price}</span>
                </div>
              </div>
              {photos.length > 1 && (
                <div className="mt-3 flex gap-2">
                  {photos.map((_, i) => (
                    <button key={i} type="button" onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`} aria-pressed={photo === i}
                      className={`h-2 w-6 transition-colors ${photo === i ? "bg-[#E8500A]" : "bg-white/20 hover:bg-white/40"}`} />
                  ))}
                </div>
              )}
            </div>

            <button type="button" onClick={() => open(active! + 1)} aria-label={`Next: ${websiteProductTitle(next.name)}`} className="group flex items-center gap-6">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-white/30 text-white transition-colors group-hover:border-[#E8500A] group-hover:text-[#E8500A]">→</span>
              <span className="relative hidden aspect-[3/4] w-32 opacity-40 blur-[5px] transition group-hover:opacity-70 group-hover:blur-[2px] lg:block">
                <Image src={next.imageUrls![0]} alt="" fill sizes="128px" className="object-cover" />
              </span>
            </button>
          </div>

          <h3 className="mx-auto mt-6 max-w-xl text-center font-display text-3xl font-extrabold uppercase leading-[0.95] text-white sm:text-4xl">
            {websiteProductTitle(item.name)}
          </h3>
          <p className="mt-2 text-center text-sm text-[#aaa]">{item.brand} · Fits {productSizeLabel(item)}{item.era ? ` · ${item.era}` : ""}</p>
          <div className="mx-auto mt-5 flex max-w-sm flex-col gap-2 sm:flex-row">
            <AddToCartButton product={item} className="flex-1 bg-[#E8500A] py-3 text-[11px] font-black tracking-[0.14em] text-white transition-colors hover:bg-[#F5C300] hover:text-black" />
            <button type="button" onClick={() => onSelect(item)} className="flex-1 border border-white/30 py-3 text-[11px] font-black tracking-[0.14em] text-white transition-colors hover:border-[#E8500A] hover:text-[#E8500A]">
              QUICK VIEW
            </button>
          </div>
          <div className="mt-4 flex justify-center gap-6 text-xs">
            <Link href={productPath(item)} className="font-bold text-[#aaa] underline underline-offset-4 hover:text-white">Full details</Link>
            <button type="button" onClick={() => setActive(null)} className="font-bold text-[#aaa] underline underline-offset-4 hover:text-white">Back to the rail</button>
          </div>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto pb-4 scrollbar-none">
          <div className="relative mx-auto w-max px-4 sm:px-6 lg:px-8">
            <div className="absolute inset-x-2 top-0 h-1.5 rounded-full bg-gradient-to-b from-[#ffd9b8] via-[#E8500A] to-[#6b2504] shadow-[0_3px_8px_rgba(0,0,0,.6)]" />
            <ul className="flex gap-2 sm:gap-3">
              {rail.map((product, i) => (
                <li key={product.id}>
                  <button type="button" onClick={() => open(i)} aria-label={`See ${websiteProductTitle(product.name)} up close`}
                    className="rail-hang group flex w-28 flex-col items-center sm:w-32">
                    <Hanger className="-mt-0.5 h-6 w-11 text-[#bbb] transition-colors group-hover:text-[#F5C300]" />
                    <span className="relative -mt-1 block aspect-[3/4] w-full shadow-[0_10px_18px_rgba(0,0,0,.6)] outline-2 outline-offset-2 outline-transparent transition-[outline-color] group-hover:outline-[#E8500A]">
                      <Image src={product.imageUrls![0]} alt="" fill sizes="128px" className="object-cover" />
                    </span>
                    <span className="mt-2 font-plexmono text-[11px] uppercase tracking-[0.08em] text-[#bbb] group-hover:text-[#F5C300]">£{product.price}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

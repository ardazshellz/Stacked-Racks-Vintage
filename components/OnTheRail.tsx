"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { type Product, railPicks, productSizeLabel, websiteProductTitle } from "@/lib/products";
import { productPath } from "@/lib/product-url";
import AddToCartButton from "./AddToCartButton";
import CUTOUTS from "@/lib/rail-cutouts.json";

const BOTTOMS = new Set(["Trousers", "Joggers & Tracksuit Bottoms", "Shorts"]);
const SHAPES = CUTOUTS as Record<string, { back: number | null }>;
// Garment thickness in px, built from stacked copies of the cut-out so side-on pieces look solid.
const DEPTH = 18;
const LAYERS = 6;
const SHADE = "linear-gradient(90deg, rgba(0,0,0,.5), rgba(0,0,0,0) 28%, rgba(255,255,255,.07) 50%, rgba(0,0,0,0) 72%, rgba(0,0,0,.5))";

function Hanger({ clip }: { clip: boolean }) {
  return (
    <svg viewBox="0 0 120 52" aria-hidden="true" className="relative z-10 mx-auto -mb-3 block w-[46%] text-[#c9c9c9] drop-shadow-[0_2px_2px_rgba(0,0,0,.6)]">
      <path d="M60 22V12a7 7 0 1 1 7-7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      {clip ? (
        <>
          <path d="M14 30h92" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M60 22 40 30M60 22l20 8" stroke="currentColor" strokeWidth="3" />
          <rect x="18" y="30" width="10" height="16" rx="2" fill="currentColor" />
          <rect x="92" y="30" width="10" height="16" rx="2" fill="currentColor" />
        </>
      ) : (
        <path d="M60 22 6 46h108Z" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      )}
    </svg>
  );
}

/** One face of the garment: the cut-out with rounded shading masked to its outline. */
function Face({ src, dim, back = false }: { src: string; dim: number; back?: boolean }) {
  return (
    <span className="absolute inset-0 [backface-visibility:hidden]" style={{ transform: `${back ? "rotateY(180deg) " : ""}translateZ(${DEPTH / 2}px)` }}>
      <Image src={src} alt="" fill sizes="270px" className="object-contain object-top" style={{ filter: `brightness(${dim})` }} />
      <span className="absolute inset-0" style={{ background: SHADE, mask: `url(${src}) top / contain no-repeat`, WebkitMask: `url(${src}) top / contain no-repeat` }} />
    </span>
  );
}

/** Newest pieces hanging side-on along a rail; the one in the middle turns to face you. */
export default function OnTheRail({ products, onSelect }: { products: Product[]; onSelect: (product: Product) => void }) {
  const rail = railPicks(products.filter((p) => String(p.id) in SHAPES), Object.keys(SHAPES).length);
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const count = rail.length;

  const slot = () => (scroller.current?.firstElementChild?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1;
  const goTo = (i: number, behavior: ScrollBehavior = "smooth") =>
    scroller.current?.scrollTo({ left: Math.max(0, Math.min(count - 1, i)) * slot(), behavior });

  // Start mid-rail so there are pieces either side; the scroll event then sets the active piece.
  useEffect(() => { goTo(Math.floor(count / 2), "instant"); }, [count]); // eslint-disable-line react-hooks/exhaustive-deps

  if (count < 3) return null;
  const item = rail[Math.min(active, count - 1)];
  const hasBack = SHAPES[String(item.id)]?.back != null;

  return (
    <section aria-labelledby="on-the-rail-heading" className="relative overflow-hidden border-t border-white/5 bg-[radial-gradient(55%_65%_at_50%_30%,#2a1608_0%,#0a0a0a_72%)] py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="on-the-rail-heading" className="font-display text-white text-4xl sm:text-5xl font-extrabold uppercase leading-[0.9]">
          Fresh off the rack
        </h2>
        <p className="mt-2 text-sm text-[#aaa]">Our newest pieces. Scroll along the rail; the one in the middle turns to face you.</p>
      </div>

      <div className="relative mt-8">
        {/* The rail itself stays put; the clothes slide along it. */}
        <div className="pointer-events-none absolute inset-x-0 top-[9px] z-[60] h-2 bg-gradient-to-b from-[#f4f4f4] via-[#9a9a9a] to-[#3d3d3d] shadow-[0_4px_8px_rgba(0,0,0,.7)]" />
        <div
          ref={scroller}
          tabIndex={0}
          aria-label="Clothes rail. Use the arrow keys to move along it."
          onScroll={(e) => {
            const next = Math.max(0, Math.min(count - 1, Math.round(e.currentTarget.scrollLeft / slot())));
            if (next !== active) { setActive(next); setShowBack(false); }
          }}
          className="scrollbar-none snap-x snap-mandatory overflow-x-auto overflow-y-hidden focus-visible:outline-offset-[-4px]"
        >
          <ul className="flex w-max px-[calc(50vw-28px)] sm:px-[calc(50vw-36px)]">
            {rail.map((product, i) => {
              const id = String(product.id);
              const d = i - active;
              const side = Math.sign(d);
              const facing = d === 0;
              const dim = facing ? 1 : Math.max(0.35, 0.7 - Math.abs(d) * 0.04);
              const front = `/rail/${id}.webp`;
              const back = SHAPES[id]?.back != null ? `/rail/${id}-back.webp` : front;
              return (
                <li key={product.id} className="relative h-[330px] w-14 shrink-0 snap-center [perspective:1000px] sm:h-[420px] sm:w-[72px]" style={{ zIndex: 50 - Math.abs(d) }}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => (facing ? onSelect(product) : goTo(i))}
                    aria-label={facing ? `Quick view ${websiteProductTitle(product.name)}` : `Turn ${websiteProductTitle(product.name)} to face you`}
                    className="absolute left-1/2 top-0 w-[210px] origin-top transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] [transform-style:preserve-3d] sm:w-[270px]"
                    style={{ transform: `translateX(-50%) translateX(${side * (facing ? 0 : 92)}px) rotateY(${side * -80}deg) scale(${facing ? 1 : 0.94})` }}
                  >
                    <span className={`block origin-top [transform-style:preserve-3d] ${facing && !showBack ? "rail-sway" : ""}`}>
                      <span
                        className="block origin-top transition-transform duration-700 ease-[cubic-bezier(.3,.7,.2,1)] [transform-style:preserve-3d]"
                        style={{ transform: `rotateY(${facing && showBack ? 180 : 0}deg)` }}
                      >
                        <Hanger clip={BOTTOMS.has(product.category)} />
                        <span className="relative block aspect-[4/5] w-full [transform-style:preserve-3d]">
                          <Face src={front} dim={dim} />
                          {Array.from({ length: LAYERS - 1 }, (_, k) => (
                            <span key={k} className="absolute inset-0" style={{ transform: `translateZ(${DEPTH / 2 - ((k + 1) * DEPTH) / LAYERS}px)` }}>
                              <Image src={front} alt="" fill sizes="270px" className="object-contain object-top" style={{ filter: `brightness(${dim * 0.3})` }} />
                            </span>
                          ))}
                          <Face src={back} dim={dim} back />
                        </span>
                      </span>
                    </span>
                    {facing && (
                      <span className="absolute right-1 top-10" style={{ transform: `translateZ(${DEPTH}px)` }}>
                        <span className="rail-tag relative block w-16 rounded-sm bg-[#F5C300] px-1.5 pb-2 pt-3 text-center text-[#0a0a0a] shadow-[0_6px_10px_rgba(0,0,0,.5)]">
                          <span className="absolute left-1/2 top-1 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#0a0a0a]" />
                          <span className="block font-plexmono text-[10px] uppercase leading-tight">Size {product.size}</span>
                          <span className="block font-display text-2xl font-extrabold leading-none">£{product.price}</span>
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <button type="button" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Previous piece"
          className="absolute left-3 top-1/2 z-[70] hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-[#0a0a0a]/70 text-white transition-colors hover:border-[#E8500A] hover:text-[#E8500A] disabled:opacity-30 sm:left-8 sm:grid">←</button>
        <button type="button" onClick={() => goTo(active + 1)} disabled={active === count - 1} aria-label="Next piece"
          className="absolute right-3 top-1/2 z-[70] hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-[#0a0a0a]/70 text-white transition-colors hover:border-[#E8500A] hover:text-[#E8500A] disabled:opacity-30 sm:right-8 sm:grid">→</button>
      </div>

      <div className="mx-auto mt-2 max-w-xl px-4 text-center" aria-live="polite">
        {hasBack && (
          <button type="button" onClick={() => setShowBack(!showBack)} aria-pressed={showBack}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#F5C300]/60 px-5 py-2 text-[11px] font-black tracking-[0.14em] text-[#F5C300] transition-colors hover:bg-[#F5C300] hover:text-black">
            <span aria-hidden="true">↻</span>{showBack ? "SEE FRONT" : "SEE BACK"}
          </button>
        )}
        <h3 className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-white sm:text-4xl">{websiteProductTitle(item.name)}</h3>
        <p className="mt-2 text-sm text-[#aaa]">{item.brand} · Fits {productSizeLabel(item)}{item.era ? ` · ${item.era}` : ""} · £{item.price}</p>
        <div className="mx-auto mt-5 flex max-w-sm flex-col gap-2 sm:flex-row">
          <AddToCartButton product={item} className="flex-1 bg-[#E8500A] py-3 text-[11px] font-black tracking-[0.14em] text-white transition-colors hover:bg-[#F5C300] hover:text-black" />
          <button type="button" onClick={() => onSelect(item)} className="flex-1 border border-white/30 py-3 text-[11px] font-black tracking-[0.14em] text-white transition-colors hover:border-[#E8500A] hover:text-[#E8500A]">
            QUICK VIEW
          </button>
        </div>
        <Link href={productPath(item)} className="mt-4 inline-block text-xs font-bold text-[#aaa] underline underline-offset-4 hover:text-white">Full details</Link>
      </div>
    </section>
  );
}

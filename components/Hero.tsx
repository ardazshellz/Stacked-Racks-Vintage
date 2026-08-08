"use client";

import { useEffect, useRef, useState } from "react";

interface Stats { followers: number; sales: number; live: boolean }

function fmtNum(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

export default function Hero() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<Stats>({ followers: 2469, sales: 5000, live: false });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) return;
        const data: Stats = await res.json();
        if (!cancelled) setStats(data);
      } catch { /* ignore */ }
    }
    load();
    const interval = setInterval(load, 5 * 60 * 1000); // refresh every 5 min
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      const t = Math.min(y / (vh * 0.9), 1);
      if (overlayRef.current) overlayRef.current.style.opacity = String(t);
      if (bgRef.current) bgRef.current.style.transform = `translateY(${y * 0.35}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative h-screen flex items-end overflow-hidden">
      {/* Background image with parallax */}
      <div
        ref={bgRef}
        className="absolute inset-0 -bottom-24 bg-cover bg-center bg-no-repeat will-change-transform"
        style={{ backgroundImage: "url('/hero-rail.jpg')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[#0a0a0a] -z-10" aria-hidden="true" />

      {/* Static bottom-fade gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.08) 30%, rgba(10,10,10,0.6) 65%, rgba(10,10,10,0.95) 85%, #0a0a0a 100%)",
        }}
        aria-hidden="true"
      />

      {/* Scroll-driven overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-[#0a0a0a] pointer-events-none"
        style={{ opacity: 0 }}
        aria-hidden="true"
      />

      {/* Content — bottom-left */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pb-16 sm:pb-20">
        {/* Eyebrow */}
        <p className="animate-fade-in-up inline-flex items-center gap-2 text-[#E8500A] text-[9px] sm:text-[10px] font-black tracking-[0.3em] uppercase mb-5">
          <span className="opacity-60">✦</span>
          80S / 90S / 00S VINTAGE
          <span className="opacity-60">✦</span>
        </p>

        {/* Brand name */}
        <h1
          className="animate-fade-in-up-delay-1 leading-[0.88] mb-5"
          style={{ fontFamily: "var(--font-playfair-display), serif" }}
        >
          <span className="block text-[clamp(3.2rem,9vw,6.5rem)] font-black text-[#E8500A] tracking-tight">
            STACKED
          </span>
          <span className="block text-[clamp(3.2rem,9vw,6.5rem)] font-black text-[#F5C300] tracking-tight">
            RACKS
          </span>
          <span className="block text-[clamp(1.4rem,4vw,2.8rem)] font-bold text-white/70 tracking-[0.18em] mt-2">
            VINTAGE
          </span>
        </h1>

        {/* Tagline */}
        <p className="animate-fade-in-up-delay-2 text-white/65 text-xs sm:text-sm tracking-[0.22em] uppercase font-normal mb-5">
          Unique & Rare Vintage · London, UK
        </p>

        {/* Reviews badge — links to Vinted reviews */}
        <a
          href="https://www.vinted.co.uk/member/59714764?tab=feedback"
          target="_blank"
          rel="noopener noreferrer"
          className="animate-fade-in-up-delay-2 inline-flex items-center gap-2 bg-[#F5C300]/8 border border-[#F5C300]/25 text-[#F5C300] text-[10px] font-bold tracking-[0.15em] uppercase px-3 py-1.5 mb-8 hover:bg-[#F5C300]/15 transition-colors"
        >
          <span>★★★★★</span>
          <span>2,500+ Verified Reviews</span>
        </a>

        {/* CTAs + subtle stats */}
        <div className="animate-fade-in-up-delay-3 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <a
            href="#shop"
            className="w-full sm:w-auto bg-[#E8500A] text-white font-black text-[10px] tracking-[0.3em] uppercase px-9 py-3.5 hover:bg-[#c94009] transition-colors text-center shadow-[0_0_28px_rgba(232,80,10,0.35)]"
          >
            SHOP NOW
          </a>
          <a
            href="https://www.vinted.co.uk/member/59714764-stackedracks"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto border border-[#F5C300]/60 text-[#F5C300] font-black text-[10px] tracking-[0.3em] uppercase px-9 py-3.5 hover:bg-[#F5C300]/10 transition-colors text-center"
          >
            VIEW ON VINTED
          </a>

          {/* Desktop stats */}
          <div className="hidden lg:flex items-center gap-5 ml-4 pl-6 border-l border-white/20 text-xs tracking-widest uppercase">
            <a
              href="https://www.vinted.co.uk/member/59714764-stackedracks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-bold hover:text-[#E8500A] transition-colors"
            >
              {fmtNum(stats.sales)}+ <span className="text-white/60 font-normal group-hover:text-[#E8500A]">Sales</span>
            </a>
            <span className="text-white/20">·</span>
            <a
              href="https://www.vinted.co.uk/member/59714764-stackedracks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-bold hover:text-[#E8500A] transition-colors"
            >
              {fmtNum(stats.followers)} <span className="text-white/60 font-normal">Followers{stats.live && " ↑"}</span>
            </a>
          </div>
        </div>

        {/* Mobile stats */}
        <a
          href="https://www.vinted.co.uk/member/59714764-stackedracks"
          target="_blank"
          rel="noopener noreferrer"
          className="animate-fade-in-up-delay-4 sm:hidden mt-4 text-white/60 text-[10px] tracking-[0.2em] uppercase font-medium hover:text-white/80 transition-colors inline-block"
        >
          {fmtNum(stats.sales)}+ Sales · {fmtNum(stats.followers)} Followers
        </a>
      </div>
    </section>
  );
}

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
    <section className="relative overflow-hidden border-b border-white/10 pt-[92px]">
      {/* Background image with parallax */}
      <div
        ref={bgRef}
        className="absolute inset-0 -bottom-24 bg-cover bg-[center_30%] bg-no-repeat will-change-transform"
        style={{ backgroundImage: "url('/hero-rail.jpg')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[#0a0a0a] -z-10" aria-hidden="true" />

      {/* Readability gradients: left-to-right for the copy, bottom fade into the page */}
      <div
        className="absolute inset-0 hidden lg:block"
        style={{ background: "linear-gradient(90deg, rgba(10,10,10,0.94) 0%, rgba(10,10,10,0.72) 46%, rgba(10,10,10,0.28) 100%)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 lg:hidden"
        style={{ background: "linear-gradient(0deg, rgba(10,10,10,0.96) 0%, rgba(10,10,10,0.74) 60%, rgba(10,10,10,0.5) 100%)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(0deg, #0a0a0a 0%, rgba(10,10,10,0) 38%)" }}
        aria-hidden="true"
      />

      {/* Scroll-driven overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-[#0a0a0a] pointer-events-none"
        style={{ opacity: 0 }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12 sm:pt-16 sm:pb-16 lg:pt-20 lg:pb-16 grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-8 lg:gap-10 items-end">
        <div>
          {/* Eyebrow */}
          <p className="animate-fade-in-up font-plexmono text-[#F5C300] text-[11px] sm:text-xs font-medium tracking-[0.14em] uppercase">
            80S / 90S / 00S VINTAGE &nbsp;·&nbsp; LONDON, UK
          </p>

          {/* Brand name: condensed lettering with a little room between the lines */}
          <h1 className="animate-fade-in-up-delay-1 font-display font-black uppercase mt-4 flex flex-col gap-[0.09em] sm:gap-[0.045em] leading-[0.8] tracking-[-0.005em] text-[clamp(84px,14vw,200px)]">
            <span className="block text-white">STACKED</span>
            <span className="block text-[#E8500A]">RACKS</span>
            <span className="block text-[0.34em] font-extrabold tracking-[0.34em] text-[#F5C300] mt-[0.22em]">VINTAGE</span>
          </h1>

          <p className="animate-fade-in-up-delay-2 mt-6 max-w-[46ch] text-[#D8D2C7] text-base sm:text-lg leading-relaxed">
            Unique &amp; rare football shirts, band tees, workwear and sports jerseys. Fresh pieces land every fortnight, and free UK shipping kicks in over £50.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in-up-delay-3 mt-7 flex flex-col sm:flex-row gap-3">
            <a
              href="#shop"
              className="w-full sm:w-auto bg-[#E8500A] border-2 border-[#E8500A] text-[#0a0a0a] font-plexmono font-medium text-[13px] tracking-[0.12em] uppercase px-7 py-4 hover:bg-[#FF6A24] hover:border-[#FF6A24] transition-colors text-center"
            >
              Shop the latest drop →
            </a>
            <a
              href="https://www.vinted.co.uk/member/59714764-stackedracks"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto border-2 border-[#F5C300] text-[#F5C300] font-plexmono font-medium text-[13px] tracking-[0.12em] uppercase px-7 py-4 hover:bg-[#F5C300] hover:text-[#0a0a0a] transition-colors text-center"
            >
              View on Vinted
            </a>
          </div>
        </div>

        {/* Scoreboard: live sales and followers, plus review link */}
        <div className="animate-fade-in-up-delay-3 grid grid-cols-2 border border-white/20 bg-[#0a0a0a]/60 backdrop-blur-[6px]">
          <a
            href="https://www.vinted.co.uk/member/59714764-stackedracks"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-5 sm:p-6 hover:bg-white/[0.03] transition-colors"
          >
            <div className="font-display font-black text-[#F5C300] text-[clamp(52px,7vw,88px)] leading-[0.85] tabular-nums">
              {fmtNum(stats.sales)}<sup className="text-[0.5em] align-top text-[#E8500A]">+</sup>
            </div>
            <div className="mt-2 font-plexmono text-[12px] tracking-[0.06em] uppercase text-white">Sales</div>
          </a>
          <a
            href="https://www.vinted.co.uk/member/59714764-stackedracks"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-5 sm:p-6 border-l border-white/20 hover:bg-white/[0.03] transition-colors"
          >
            <div className="font-display font-black text-[#F5C300] text-[clamp(52px,7vw,88px)] leading-[0.85] tabular-nums">
              {fmtNum(stats.followers)}
            </div>
            <div className="mt-2 font-plexmono text-[12px] tracking-[0.06em] uppercase text-white">
              Followers{stats.live && " ↑"}
            </div>
          </a>
          <a
            href="https://www.vinted.co.uk/member/59714764?tab=feedback"
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 flex items-center gap-3 border-t border-white/20 px-5 sm:px-6 py-3.5 font-plexmono text-[12px] tracking-[0.06em] uppercase text-white hover:bg-white/[0.03] transition-colors"
          >
            <span aria-hidden="true" className="text-[#F5C300] tracking-[0.2em] text-sm">★★★★★</span>
            <span>2,500+ verified reviews on Vinted</span>
          </a>
        </div>
      </div>
    </section>
  );
}

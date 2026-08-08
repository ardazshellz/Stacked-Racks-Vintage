"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { getBrandsInStock, products } from "@/lib/products";
import CartLink from "./CartLink";

interface DropdownGroup {
  heading: string;
  items: { label: string; href: string }[];
}

interface NavItem {
  label: string;
  href: string;
  groups: DropdownGroup[];
}

function buildNavItems(inStockBrands: string[]): NavItem[] {
  const mensBrands = inStockBrands.map((b) => ({
    label: b,
    href: `/shop?gender=Mens&brand=${encodeURIComponent(b)}`,
  }));
  const womensBrands = inStockBrands.map((b) => ({
    label: b,
    href: `/shop?gender=Womens&brand=${encodeURIComponent(b)}`,
  }));

  return [
    {
      label: "New In",
      href: "/shop?new=true",
      groups: [
        {
          heading: "Gender",
          items: [
            { label: "Mens", href: "/shop?new=true&gender=Mens" },
            { label: "Womens", href: "/shop?new=true&gender=Womens" },
          ],
        },
        {
          heading: "Size",
          items: ["XS", "S", "M", "L", "XL", "XXL"].map((s) => ({
            label: s,
            href: `/shop?new=true&size=${s}`,
          })),
        },
        ...(inStockBrands.length
          ? [{ heading: "Brand", items: inStockBrands.map((b) => ({ label: b, href: `/shop?new=true&brand=${encodeURIComponent(b)}` })) }]
          : []),
      ],
    },
    {
      label: "Mens",
      href: "/shop?gender=Mens",
      groups: [
        {
          heading: "Category",
          items: ["Jackets", "Hoodies", "T-Shirts", "Jerseys", "Knitwear", "Hats"].map((c) => ({
            label: c,
            href: `/shop?gender=Mens&category=${encodeURIComponent(c)}`,
          })),
        },
        {
          heading: "Size",
          items: ["S", "M", "L", "XL", "XXL"].map((s) => ({
            label: s,
            href: `/shop?gender=Mens&size=${s}`,
          })),
        },
        ...(mensBrands.length ? [{ heading: "Brand", items: mensBrands }] : []),
      ],
    },
    {
      label: "Womens",
      href: "/shop?gender=Womens",
      groups: [
        {
          heading: "Category",
          items: ["Jackets", "Tops", "Knitwear", "Hats"].map((c) => ({
            label: c,
            href: `/shop?gender=Womens&category=${encodeURIComponent(c)}`,
          })),
        },
        {
          heading: "Size",
          items: ["XS", "S", "M", "L", "XL", "XXL"].map((s) => ({
            label: s,
            href: `/shop?gender=Womens&size=${s}`,
          })),
        },
        ...(womensBrands.length ? [{ heading: "Brand", items: womensBrands }] : []),
      ],
    },
    {
      label: "Marquee",
      href: "/shop?rare=true",
      groups: [
        {
          heading: "Browse",
          items: [
            { label: "All Marquee", href: "/shop?rare=true" },
            { label: "Mens", href: "/shop?rare=true&gender=Mens" },
            { label: "Womens", href: "/shop?rare=true&gender=Womens" },
          ],
        },
        {
          heading: "Era",
          items: ["80s", "90s", "00s", "2010s", "2020s"].map((e) => ({
            label: e,
            href: `/shop?era=${e}`,
          })),
        },
        ...(inStockBrands.length
          ? [{ heading: "Brand", items: inStockBrands.map((b) => ({ label: b, href: `/shop?rare=true&brand=${encodeURIComponent(b)}` })) }]
          : []),
      ],
    },
  ];
}

export default function Navbar() {
  const inStockBrands = getBrandsInStock(products);
  const navItems = buildNavItems(inStockBrands);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  return (
    <nav className="fixed top-7 left-0 right-0 z-50 bg-[#0a0a0a]/96 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link href="/" aria-label="Stacked Racks Vintage Home" className="shrink-0">
            <span
              className="font-black tracking-wider leading-none"
              style={{ fontFamily: "var(--font-playfair-display), serif" }}
            >
              <span className="text-[#E8500A] text-xl">STACKED</span>
              <span className="text-[#F5C300] text-xl ml-2">RACKS</span>
              <span className="text-white/60 text-xl ml-2">VINTAGE</span>
            </span>
          </Link>

          {/* ── Desktop nav ── */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => handleMouseEnter(item.label)}
                onMouseLeave={handleMouseLeave}
              >
                <a
                  href={item.href}
                  className="px-4 py-2 text-sm font-bold text-white/70 hover:text-white transition-colors tracking-widest uppercase flex items-center gap-1.5"
                >
                  {item.label}
                  <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </a>

                {activeDropdown === item.label && (
                  <div
                    className="absolute top-full left-0 mt-0 bg-[#111] border border-white/10 shadow-2xl shadow-black/60 min-w-[300px]"
                    onMouseEnter={() => handleMouseEnter(item.label)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="flex gap-10 p-7">
                      {item.groups.map((group) => (
                        <div key={group.heading} className="min-w-[80px]">
                          {group.heading && (
                            <p className="text-xs font-black text-[#E8500A] uppercase tracking-[0.22em] mb-4">
                              {group.heading}
                            </p>
                          )}
                          <ul className="space-y-2.5">
                            {group.items.map((i) => (
                              <li key={i.label}>
                                <a
                                  href={i.href}
                                  className="text-sm font-semibold text-white/70 hover:text-white transition-colors block hover:translate-x-1 duration-150 tracking-wide"
                                >
                                  {i.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-white/5 px-7 py-3.5">
                      <a href="/shop" className="text-xs text-[#E8500A] hover:text-[#F5C300] transition-colors font-bold uppercase tracking-widest">
                        View All {item.label} →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Social links + Contact + hamburger ── */}
          <div className="flex items-center gap-1">
            <CartLink />
            {/* Instagram */}
            <a
              href="https://instagram.com/stacked_racks_vintage"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-white/50 hover:text-white transition-colors group"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <span className="text-xs font-bold tracking-wider uppercase">Instagram</span>
            </a>

            {/* Vinted */}
            <a
              href="https://www.vinted.co.uk/member/59714764-stackedracks"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-white/50 hover:text-[#F5C300] transition-colors"
            >
              <span className="text-base font-black leading-none">V</span>
              <span className="text-xs font-bold tracking-wider uppercase">Vinted</span>
            </a>

            {/* Contact */}
            <a
              href="/contact"
              className="hidden md:flex items-center px-3 py-1.5 text-xs font-bold tracking-wider uppercase text-white/50 hover:text-[#E8500A] transition-colors border border-white/10 hover:border-[#E8500A]/40 ml-1"
            >
              Contact
            </a>

            {/* Hamburger */}
            <button
              className="md:hidden text-white p-2 flex flex-col justify-center items-center w-8 h-8"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <span className={`block h-0.5 w-6 bg-white transition-all duration-300 origin-center ${mobileOpen ? "rotate-45 translate-y-[3px]" : "-translate-y-1"}`} />
              <span className={`block h-0.5 w-6 bg-white transition-all duration-300 ${mobileOpen ? "opacity-0 scale-x-0" : "opacity-100"}`} />
              <span className={`block h-0.5 w-6 bg-white transition-all duration-300 origin-center ${mobileOpen ? "-rotate-45 -translate-y-[3px]" : "translate-y-1"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      <div className={`md:hidden bg-[#111] border-t border-white/10 overflow-hidden transition-all duration-300 ${mobileOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"}`}>
        <CartLink mobile />
        {/* Social links row */}
        <div className="flex items-center gap-6 px-6 py-4 border-b border-white/5">
          <a href="https://instagram.com/stacked_racks_vintage" target="_blank" rel="noopener noreferrer"
            className="text-xs font-bold text-white/50 hover:text-white tracking-widest uppercase transition-colors flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            Instagram
          </a>
          <a href="https://www.vinted.co.uk/member/59714764-stackedracks" target="_blank" rel="noopener noreferrer"
            className="text-xs font-bold text-white/50 hover:text-[#F5C300] tracking-widest uppercase transition-colors">
            Vinted
          </a>
        </div>

        {navItems.map((item) => (
          <div key={item.label} className="border-b border-white/5">
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-sm font-bold text-white uppercase tracking-widest"
              onClick={() => setMobileExpanded(mobileExpanded === item.label ? null : item.label)}
            >
              {item.label}
              <svg className={`w-4 h-4 transition-transform duration-200 ${mobileExpanded === item.label ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {mobileExpanded === item.label && (
              <div className="px-6 pb-5 space-y-5">
                {item.groups.map((group) => (
                  <div key={group.heading}>
                    {group.heading && (
                      <p className="text-xs font-black text-[#E8500A] uppercase tracking-[0.22em] mb-3">{group.heading}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((i) => (
                        <a key={i.label} href={i.href} onClick={() => setMobileOpen(false)}
                          className="text-sm font-semibold text-white/70 hover:text-white border border-white/15 hover:border-white/40 px-3 py-1.5 transition-colors">
                          {i.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="p-6">
          <a href="https://www.vinted.co.uk/member/59714764-stackedracks" target="_blank" rel="noopener noreferrer"
            className="block w-full bg-[#E8500A] text-white text-center font-bold text-sm tracking-widest uppercase py-3 hover:bg-[#c94009] transition-colors">
            SHOP ON VINTED →
          </a>
        </div>
      </div>
    </nav>
  );
}

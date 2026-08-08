"use client";

import { useState } from "react";
import { isNew, SIZES, FITS, ERAS, getBrandsInStock, CATEGORIES } from "@/lib/products";
import { useProducts } from "@/hooks/useProducts";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import MarqueeBanner from "@/components/MarqueeBanner";
import SectionBoxes from "@/components/SectionBoxes";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import { Product } from "@/lib/products";
import Footer from "@/components/Footer";
import EmailPopup from "@/components/EmailPopup";
import { useRouter } from "next/navigation";

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Are all items authentic vintage?",
    a: "Yes — every piece is personally sourced and verified. We only sell genuine vintage clothing from the 80s, 90s, 00s and beyond. If we're not 100% sure, we don't list it.",
  },
  {
    q: "How are items graded / what do condition ratings mean?",
    a: "Excellent — minimal to no visible wear, looks close to new. Good — light vintage wear consistent with age, clearly described in the listing. Fair — noticeable wear that adds character; any flaws are always shown in photos and described honestly.",
  },
  {
    q: "How does buying work?",
    a: "You can purchase directly through our website using secure card checkout, or find us on Vinted. Either way your payment is handled securely and your order details are sent straight to us.",
  },
  {
    q: "How long does shipping take?",
    a: "We ship via Royal Mail within 24–48 hours of payment. UK delivery typically takes 2–3 working days. You'll receive tracking information once your order has been dispatched.",
  },
  {
    q: "Do you ship internationally?",
    a: "Yes, we ship internationally. Shipping costs and delivery times vary by destination — message us on Instagram before ordering and we'll confirm the rate for you.",
  },
  {
    q: "Do you accept offers or negotiate on price?",
    a: "Sometimes — feel free to message us on Instagram. We're more flexible on items that have been listed for a while.",
  },
  {
    q: "How do I know what size to order?",
    a: "Each listing includes the labelled size and we recommend checking the Size Guide on each item card. Vintage sizing often runs differently from modern sizing — when in doubt, message us and we'll measure the item for you.",
  },
  {
    q: "What is your returns policy?",
    a: "We accept returns within 7 days of delivery on reasonable grounds. Items must be returned in the same condition as received. Clear photo evidence of the issue is required before any return is approved — contact us via Instagram DM. Buyers cover return postage unless the item is significantly not as described.",
  },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="bg-[#080808] border-t border-white/5 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <p className="text-[#E8500A] text-[10px] font-black tracking-[0.3em] uppercase mb-3 text-center">FAQ</p>
        <h2
          className="text-white text-2xl sm:text-3xl font-black tracking-wider text-center mb-10"
          style={{ fontFamily: "var(--font-playfair-display), serif" }}
        >
          Common Questions
        </h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="border border-white/8 overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left group"
              >
                <span className="text-white text-sm font-bold tracking-wide group-hover:text-[#E8500A] transition-colors pr-4">
                  {item.q}
                </span>
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  className={`w-4 h-4 text-[#E8500A] shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {open === i && (
                <div className="px-5 pb-5 border-t border-white/5">
                  <p className="text-[#aaa] text-sm leading-relaxed pt-4">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Homepage ─────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [selectedGender, setSelectedGender] = useState<"All" | "Mens" | "Womens">("All");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFits, setSelectedFits] = useState<string[]>([]);
  const [selectedEras, setSelectedEras] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [showMarquee, setShowMarquee] = useState(false);
  const [orderStatus, setOrderStatus] = useState<"success" | "cancelled" | null>(null);

  // Read ?order= param from URL without useSearchParams (no Suspense needed)
  useState(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const s = p.get("order");
    if (s === "success" || s === "cancelled") {
      setOrderStatus(s);
      window.history.replaceState({}, "", window.location.pathname);
    }
  });

  const products = useProducts();
  const inStockBrands = getBrandsInStock(products);

  const hasFilters =
    selectedGender !== "All" ||
    selectedSizes.length > 0 ||
    selectedBrands.length > 0 ||
    selectedCategories.length > 0 ||
    selectedFits.length > 0 ||
    selectedEras.length > 0 ||
    showNew ||
    showMarquee;

  const clearFilters = () => {
    setSelectedGender("All");
    setSelectedSizes([]);
    setSelectedBrands([]);
    setSelectedCategories([]);
    setSelectedFits([]);
    setSelectedEras([]);
    setShowNew(false);
    setShowMarquee(false);
    setSearchQuery("");
  };

  const filtered = products.filter((p) => {
    if (showNew && !isNew(p)) return false;
    if (showMarquee && p.badge !== "RARE") return false;
    const genderMatch = selectedGender === "All" || p.gender === selectedGender;
    const sizeMatch = selectedSizes.length === 0 || selectedSizes.includes(p.size);
    const brandMatch = selectedBrands.length === 0 || selectedBrands.includes(p.brand);
    const catMatch = selectedCategories.length === 0 || selectedCategories.includes(p.category);
    const fitMatch = selectedFits.length === 0 || selectedFits.includes(p.fit);
    const eraMatch = selectedEras.length === 0 || selectedEras.includes(p.era);
    const searchMatch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.size.toLowerCase().includes(searchQuery.toLowerCase());
    return genderMatch && sizeMatch && brandMatch && catMatch && fitMatch && eraMatch && searchMatch;
  });

  const SidebarContent = () => {
    const sectionCounts = {
      newIn: products.filter(isNew).length,
      mens: products.filter((p) => p.gender === "Mens" && p.stock > 0).length,
      womens: products.filter((p) => p.gender === "Womens" && p.stock > 0).length,
      marquee: products.filter((p) => p.badge === "RARE" && p.stock > 0).length,
    };

    const sections = [
      {
        key: "newIn",
        label: "New In",
        count: sectionCounts.newIn,
        active: showNew,
        onClick: () => { setShowNew(!showNew); setShowMarquee(false); setSelectedGender("All"); },
      },
      {
        key: "mens",
        label: "Mens",
        count: sectionCounts.mens,
        active: selectedGender === "Mens" && !showNew && !showMarquee,
        onClick: () => { setSelectedGender(selectedGender === "Mens" ? "All" : "Mens"); setShowNew(false); setShowMarquee(false); },
      },
      {
        key: "womens",
        label: "Womens",
        count: sectionCounts.womens,
        active: selectedGender === "Womens" && !showNew && !showMarquee,
        onClick: () => { setSelectedGender(selectedGender === "Womens" ? "All" : "Womens"); setShowNew(false); setShowMarquee(false); },
      },
      {
        key: "marquee",
        label: "Marquee",
        count: sectionCounts.marquee,
        active: showMarquee,
        onClick: () => { setShowMarquee(!showMarquee); setShowNew(false); setSelectedGender("All"); },
      },
    ];

    return (
    <div className="space-y-6">
      {/* Section shortcuts */}
      <div>
        <p className="text-[#E8500A] text-[10px] font-black tracking-[0.25em] uppercase mb-3">Sections</p>
        <div className="flex flex-col divide-y divide-white/5 border border-white/8">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={s.onClick}
              className={`flex items-center justify-between px-3 py-2.5 text-left transition-all group ${
                s.active ? "bg-[#E8500A]/10" : "hover:bg-white/[0.03]"
              }`}
            >
              <span className={`text-xs font-black tracking-[0.15em] uppercase transition-colors ${
                s.active ? "text-[#E8500A]" : "text-[#aaa] group-hover:text-white"
              }`}>
                {s.active && "✦ "}{s.label}
              </span>
              <span className={`text-[10px] font-bold tabular-nums ${s.active ? "text-[#E8500A]" : "text-[#444]"}`}>
                {s.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Size */}
      <div>
        <p className="text-[#E8500A] text-[10px] font-black tracking-[0.25em] uppercase mb-3">Size</p>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((s) => {
            const active = selectedSizes.includes(s);
            return (
              <button key={s} onClick={() => setSelectedSizes((p) => toggle(p, s))}
                className={`text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border transition-all ${
                  active ? "bg-[#E8500A] border-[#E8500A] text-white" : "border-white/15 text-[#aaa] hover:border-white/40 hover:text-white"
                }`}>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Era */}
      <div>
        <p className="text-[#E8500A] text-[10px] font-black tracking-[0.25em] uppercase mb-3">Era</p>
        <div className="flex flex-wrap gap-1.5">
          {ERAS.map((e) => {
            const active = selectedEras.includes(e);
            return (
              <button key={e} onClick={() => setSelectedEras((prev) => toggle(prev, e))}
                className={`text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border transition-all ${
                  active ? "bg-[#E8500A] border-[#E8500A] text-white" : "border-white/15 text-[#aaa] hover:border-white/40 hover:text-white"
                }`}>
                {e}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Brand */}
      <div>
        <p className="text-[#E8500A] text-[10px] font-black tracking-[0.25em] uppercase mb-3">Brand</p>
        <div className="flex flex-col gap-1.5">
          {inStockBrands.map((b) => {
            const active = selectedBrands.includes(b);
            return (
              <button key={b} onClick={() => setSelectedBrands((p) => toggle(p, b))}
                className={`text-left text-xs font-bold tracking-wider uppercase px-3 py-1.5 border transition-all ${
                  active ? "bg-[#E8500A] border-[#E8500A] text-white" : "border-white/15 text-[#aaa] hover:border-white/40 hover:text-white"
                }`}>
                {b}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Category */}
      <div>
        <p className="text-[#E8500A] text-[10px] font-black tracking-[0.25em] uppercase mb-3">Category</p>
        <div className="flex flex-col gap-1.5">
          {CATEGORIES.map((c) => {
            const active = selectedCategories.includes(c);
            return (
              <button key={c} onClick={() => setSelectedCategories((p) => toggle(p, c))}
                className={`text-left text-xs font-bold tracking-wider uppercase px-3 py-1.5 border transition-all ${
                  active ? "bg-[#E8500A] border-[#E8500A] text-white" : "border-white/15 text-[#aaa] hover:border-white/40 hover:text-white"
                }`}>
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Fit */}
      <div>
        <p className="text-[#E8500A] text-[10px] font-black tracking-[0.25em] uppercase mb-3">Fit</p>
        <div className="flex flex-col gap-1.5">
          {FITS.map((f) => {
            const active = selectedFits.includes(f);
            return (
              <button key={f} onClick={() => setSelectedFits((p) => toggle(p, f))}
                className={`text-left text-xs font-bold tracking-wider uppercase px-3 py-1.5 border transition-all ${
                  active ? "bg-[#E8500A] border-[#E8500A] text-white" : "border-white/15 text-[#aaa] hover:border-white/40 hover:text-white"
                }`}>
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/5 pt-4 space-y-2">
        {hasFilters && (
          <button onClick={clearFilters}
            className="text-[10px] text-[#E8500A] hover:text-[#F5C300] font-bold tracking-widest uppercase transition-colors">
            Clear Filters
          </button>
        )}
        <p className="text-[#333] text-[10px] uppercase tracking-widest">
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      {/* Order status banners */}
      {orderStatus === "success" && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 max-w-md w-full p-8 text-center">
            <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7 text-emerald-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-white text-2xl font-black tracking-wider mb-3"
              style={{ fontFamily: "var(--font-playfair-display), serif" }}>
              Order Confirmed!
            </h2>
            <p className="text-[#aaa] text-sm mb-2">Payment received — thank you.</p>
            <p className="text-[#666] text-sm mb-7">
              You'll receive a confirmation email shortly. We'll dispatch within 24–48 hours via Royal Mail.
            </p>
            <button
              onClick={() => setOrderStatus(null)}
              className="w-full bg-[#E8500A] text-white font-black text-xs tracking-[0.2em] uppercase py-3.5 hover:bg-[#c94009] transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}
      {orderStatus === "cancelled" && (
        <div className="fixed top-[92px] left-0 right-0 z-50 bg-[#1a0a0a] border-b border-red-500/20 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-[#aaa] text-sm">Payment cancelled — your item is still available.</p>
            <button onClick={() => setOrderStatus(null)} className="text-[#555] hover:text-white text-xs ml-4">✕</button>
          </div>
        </div>
      )}

      <Hero />
      <MarqueeBanner />
      <SectionBoxes />

      {/* ── Browse section ── */}
      <div id="shop" className="border-t border-white/5">
        {/* Browse header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2
                className="text-white text-xl sm:text-2xl font-black tracking-wider"
                style={{ fontFamily: "var(--font-playfair-display), serif" }}
              >
                Browse <span className="text-[#E8500A]">All Items</span>
              </h2>
              <p className="text-[#555] text-xs mt-0.5">
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                {hasFilters && " · filtered"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative hidden sm:block">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555] pointer-events-none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, brand, size…" className="bg-[#1a1a1a] border border-white/20 text-white text-xs pl-8 pr-3 py-2.5 w-64 focus:outline-none focus:border-[#E8500A]/60 placeholder:text-white/30" />
              </div>

              {/* Mobile filter toggle */}
              <button onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden flex items-center gap-2 border border-white/20 text-white text-xs font-bold tracking-widest uppercase px-3 py-2 hover:border-[#E8500A] hover:text-[#E8500A] transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
                </svg>
                Filters {hasFilters && <span className="bg-[#E8500A] text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-black">{filtered.length}</span>}
              </button>

              <button onClick={() => router.push("/shop")}
                className="text-[#E8500A] text-xs font-bold tracking-widest uppercase hover:text-[#F5C300] transition-colors">
                Full Shop →
              </button>
            </div>
          </div>
        </div>

        {/* ── Category shortcut strip ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-5">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const active = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategories((prev) => toggle(prev, cat))}
                  className={`text-[10px] font-black tracking-[0.15em] uppercase px-3 py-1.5 border transition-all duration-150 ${
                    active
                      ? "bg-[#E8500A] border-[#E8500A] text-white"
                      : "border-white/15 text-[#666] hover:border-white/35 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar + grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-10">
            <aside className="hidden lg:block w-44 xl:w-52 shrink-0">
              <div className="sticky top-[108px]">
                <SidebarContent />
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              {filtered.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/10">
                  <p className="text-white font-bold mb-2">No items match</p>
                  <p className="text-[#555] text-sm mb-4">Try clearing your filters</p>
                  <button onClick={clearFilters}
                    className="text-xs text-[#E8500A] border border-[#E8500A] px-5 py-2 font-bold tracking-widest uppercase hover:bg-[#E8500A] hover:text-white transition-colors">
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {filtered.map((product) => (
                    <ProductCard key={product.id} product={product}
                      onClick={() => setSelectedProduct(product)} />
                  ))}
                </div>
              )}

              <div className="mt-10 text-center border border-white/8 py-8 px-4">
                <p className="text-[#aaa] text-sm mb-1">See everything</p>
                <p className="text-white font-bold mb-5">Full collection with all filters</p>
                <button onClick={() => router.push("/shop")}
                  className="inline-flex items-center gap-2 bg-[#E8500A] text-white font-black text-xs tracking-[0.2em] uppercase px-8 py-3.5 hover:bg-[#c94009] transition-colors mr-3">
                  BROWSE ALL ITEMS
                </button>
                <a href="https://www.vinted.co.uk/member/59714764-stackedracks" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-[#F5C300] text-[#F5C300] font-black text-xs tracking-[0.2em] uppercase px-8 py-3.5 hover:bg-[#F5C300]/10 transition-colors">
                  VIEW ON VINTED →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileFiltersOpen(false)} />
      )}
      <div className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#111] border-r border-white/10 p-6 overflow-y-auto transition-transform duration-300 lg:hidden ${mobileFiltersOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between mb-7">
          <span className="text-white font-black text-base tracking-widest uppercase" style={{ fontFamily: "var(--font-playfair-display), serif" }}>Filters</span>
          <button onClick={() => setMobileFiltersOpen(false)} className="text-[#aaa] hover:text-white w-8 h-8 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <SidebarContent />
        <button onClick={() => setMobileFiltersOpen(false)}
          className="w-full mt-6 bg-[#E8500A] text-white font-black text-xs tracking-[0.2em] uppercase py-3.5 hover:bg-[#c94009] transition-colors">
          SHOW {filtered.length} RESULTS
        </button>
      </div>

      <FAQSection />
      <EmailPopup />

      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}

      <Footer />
    </main>
  );
}

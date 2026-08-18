"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Product, SIZES, FITS, CATEGORIES, displayGender, getBrandsInStock, isNew, productMatchesGender, productMatchesSize } from "@/lib/products";
import { useProducts } from "@/hooks/useProducts";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import Footer from "@/components/Footer";

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  selectedGender: "All" | "Mens" | "Womens";
  selectedSizes: string[];
  selectedBrands: string[];
  selectedCategories: string[];
  selectedFits: string[];
  allBrands: string[];
  availableSizes: string[];
  availableCategories: string[];
  availableFits: string[];
  availableGenders: Array<"Mens" | "Womens">;
  onGender: (g: "All" | "Mens" | "Womens") => void;
  onToggleSize: (s: string) => void;
  onToggleBrand: (b: string) => void;
  onToggleCategory: (c: string) => void;
  onToggleFit: (f: string) => void;
  onClear: () => void;
  resultCount: number;
}

function ChipRow({
  label,
  items,
  selected,
  onToggle,
  pill = false,
}: {
  label: string;
  items: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
  pill?: boolean;
}) {
  if (!items.length) return null;

  return (
    <div className="mb-7">
      <p className="text-[10px] font-black text-[#E8500A] uppercase tracking-[0.25em] mb-3">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              onClick={() => onToggle(item)}
              className={`text-xs font-bold tracking-wider uppercase border transition-all duration-150 ${
                pill ? "px-3 py-1.5 rounded-full" : "px-3 py-1.5"
              } ${
                active
                  ? "bg-[#E8500A] border-[#E8500A] text-white shadow-[0_0_14px_rgba(232,80,10,0.4)]"
                  : "border-white/15 text-[#aaa] hover:border-white/40 hover:text-white"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Sidebar(props: SidebarProps) {
  const {
    selectedGender, selectedSizes, selectedBrands, selectedCategories, selectedFits,
    allBrands, availableSizes, availableCategories, availableFits, availableGenders,
    onGender, onToggleSize, onToggleBrand, onToggleCategory, onToggleFit,
    onClear, resultCount,
  } = props;

  const hasFilters =
    selectedGender !== "All" ||
    selectedSizes.length > 0 ||
    selectedBrands.length > 0 ||
    selectedCategories.length > 0 ||
    selectedFits.length > 0;

  return (
    <aside className="w-full lg:w-56 xl:w-64 shrink-0">
      <div className="lg:sticky lg:top-[140px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-white font-black text-sm tracking-widest uppercase"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}
          >
            Filter
          </h2>
          {hasFilters && (
            <button
              onClick={onClear}
              className="text-[10px] text-[#E8500A] hover:text-[#F5C300] font-bold tracking-widest uppercase transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Gender toggle */}
        <div className="mb-7">
          <p className="text-[10px] font-black text-[#E8500A] uppercase tracking-[0.25em] mb-3">Gender</p>
          <div className="flex gap-2">
            {(["All", ...availableGenders] as const).map((g) => (
              <button
                key={g}
                onClick={() => onGender(g)}
                className={`flex-1 text-xs font-bold tracking-wider uppercase py-1.5 border transition-all ${
                  selectedGender === g
                    ? "bg-[#E8500A] border-[#E8500A] text-white"
                    : "border-white/15 text-[#aaa] hover:border-white/40 hover:text-white"
                }`}
              >
                {displayGender(g)}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-white/5 mb-7" />

        {/* Order: Size → Brand → Category → Fit */}
        <ChipRow label="Size" items={availableSizes} selected={selectedSizes} onToggle={onToggleSize} pill />
        <div className="border-t border-white/5 mb-7" />
        <ChipRow label="Brand" items={allBrands} selected={selectedBrands} onToggle={onToggleBrand} />
        <div className="border-t border-white/5 mb-7" />
        <ChipRow label="Item Type" items={availableCategories} selected={selectedCategories} onToggle={onToggleCategory} />
        <div className="border-t border-white/5 mb-7" />
        <ChipRow label="Fit" items={availableFits} selected={selectedFits} onToggle={onToggleFit} />

        {/* Count */}
        <div className="border-t border-white/5 pt-5">
          <p className="text-[#555] text-[10px] uppercase tracking-widest">
            {resultCount} item{resultCount !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>
    </aside>
  );
}

// ─── Mobile drawer ────────────────────────────────────────────────────────────

function MobileFilterDrawer({
  open,
  onClose,
  ...sidebarProps
}: SidebarProps & { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#111] border-r border-white/10 p-6 overflow-y-auto transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-8">
          <span className="text-white font-black text-base tracking-widest uppercase"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}>
            Filters
          </span>
          <button onClick={onClose} aria-label="Close filters" className="text-[#aaa] hover:text-white w-8 h-8 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <Sidebar {...sidebarProps} />
        <button onClick={onClose}
          className="w-full mt-4 bg-[#E8500A] text-white font-black text-xs tracking-[0.2em] uppercase py-3.5 hover:bg-[#c94009] transition-colors">
          SHOW {sidebarProps.resultCount} RESULTS
        </button>
      </div>
    </>
  );
}

// ─── Shop content ─────────────────────────────────────────────────────────────

function ShopContent({ initialProducts }: { initialProducts: Product[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read URL params for initial state
  const paramGender = searchParams.get("gender") as "Mens" | "Womens" | null;
  const paramBrand = searchParams.get("brand");
  const paramSize = searchParams.get("size");
  const paramCategory = searchParams.get("category");
  const paramItem = searchParams.get("item");
  const paramNew = searchParams.get("new") === "true";
  const paramRare = searchParams.get("rare") === "true";
  const paramType = searchParams.get("type");
  const paramEra = searchParams.get("era");

  const liveProducts = useProducts();
  const products = liveProducts.length ? liveProducts : initialProducts;
  const allBrands = getBrandsInStock(products);
  const availableProducts = products.filter((product) => product.stock > 0);
  const availableSizes = SIZES.filter((size) => availableProducts.some((product) => productMatchesSize(product, size)));
  const availableCategories = CATEGORIES.filter((category) => availableProducts.some((product) => product.category === category));
  const availableFits = FITS.filter((fit) => availableProducts.some((product) => product.fit === fit));
  const availableGenders = (["Mens", "Womens"] as const).filter((gender) => availableProducts.some((product) => productMatchesGender(product, gender)));

  const [selectedGender, setSelectedGender] = useState<"All" | "Mens" | "Womens">(
    paramGender ?? "All"
  );
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    paramSize ? [paramSize] : []
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    paramBrand && allBrands.includes(paramBrand) ? [paramBrand] : []
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    paramCategory ? [paramCategory] : []
  );
  const [selectedFits, setSelectedFits] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price-low" | "price-high">("newest");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newOnly] = useState(paramNew);
  const [rareOnly] = useState(paramRare);
  const [typeFilter] = useState(paramType ?? "");
  const [eraFilter] = useState(paramEra ?? "");

  useEffect(() => {
    if (paramItem) {
      const found = products.find((p) => String(p.id) === paramItem);
      // The product list is populated asynchronously; update the modal once it arrives.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (found) setSelectedProduct(found);
    }
    // `products` is intentionally omitted because the hook returns a merged array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramItem]);

  const tog = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const filtered = products.filter((p) => {
    if (newOnly && !isNew(p)) return false;
    if (rareOnly && p.badge !== "RARE") return false;
    if (typeFilter && p.rareBadge !== typeFilter) return false;
    if (eraFilter && p.era !== eraFilter) return false;

    const genderMatch = selectedGender === "All" || productMatchesGender(p, selectedGender);
    const sizeMatch = selectedSizes.length === 0 || selectedSizes.some((size) => productMatchesSize(p, size, selectedGender === "All" ? undefined : selectedGender));
    const brandMatch = selectedBrands.length === 0 || selectedBrands.includes(p.brand);
    const catMatch = selectedCategories.length === 0 || selectedCategories.includes(p.category);
    const fitMatch = selectedFits.length === 0 || selectedFits.includes(p.fit);
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const searchMatch = !normalizedSearch || [p.name, p.brand, p.size, p.category, p.era]
      .some((value) => value.toLowerCase().includes(normalizedSearch));
    return genderMatch && sizeMatch && brandMatch && catMatch && fitMatch && searchMatch;
  }).sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    return new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime();
  });

  const sidebarProps: SidebarProps = {
    selectedGender,
    selectedSizes,
    selectedBrands,
    selectedCategories,
    selectedFits,
    allBrands,
    availableSizes,
    availableCategories,
    availableFits,
    availableGenders: [...availableGenders],
    onGender: setSelectedGender,
    onToggleSize: (s) => setSelectedSizes((prev) => tog(prev, s)),
    onToggleBrand: (b) => setSelectedBrands((prev) => tog(prev, b)),
    onToggleCategory: (c) => setSelectedCategories((prev) => tog(prev, c)),
    onToggleFit: (f) => setSelectedFits((prev) => tog(prev, f)),
    onClear: () => {
      setSelectedGender("All");
      setSelectedSizes([]);
      setSelectedBrands([]);
      setSelectedCategories([]);
      setSelectedFits([]);
      setSearchQuery("");
    },
    resultCount: filtered.length,
  };

  const hasFilters =
    selectedGender !== "All" ||
    selectedSizes.length > 0 ||
    selectedBrands.length > 0 ||
    selectedCategories.length > 0 ||
    selectedFits.length > 0;

  const activeChips = [
    ...(selectedGender !== "All" ? [selectedGender] : []),
    ...selectedSizes.map((s) => `Size ${s}`),
    ...selectedBrands,
    ...selectedCategories,
    ...selectedFits.map((f) => `Fit: ${f}`),
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar products={products} />

      {/* Page header */}
      <div className="border-b border-white/8 mt-[92px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <button
                onClick={() => router.push("/")}
                className="text-[#555] text-xs tracking-widest uppercase hover:text-[#aaa] transition-colors mb-3 flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h1
                className="text-white text-2xl sm:text-3xl font-black tracking-wider"
                style={{ fontFamily: "var(--font-playfair-display), serif" }}
              >
                {newOnly ? (
                  <><span className="text-[#F5C300]">New In</span> — Last 14 Days</>
                ) : rareOnly ? (
                  <><span className="text-[#E8500A]">Marquee</span> Pieces</>
                ) : selectedGender !== "All" ? (
                  <><span className="text-[#E8500A]">{displayGender(selectedGender)}</span> Items</>
                ) : (
                  <><span className="text-[#E8500A]">Browse</span> All Items</>
                )}
              </h1>
              <p className="text-[#555] text-xs mt-1 tracking-wide">
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                {hasFilters && " · filtered"}
              </p>
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden flex items-center gap-2 border border-white/20 text-white text-xs font-bold tracking-widest uppercase px-4 py-2.5 hover:border-[#E8500A] hover:text-[#E8500A] transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
              </svg>
              Filters
              {hasFilters && (
                <span className="bg-[#E8500A] text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-black ml-0.5">
                  {activeChips.length}
                </span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 mt-5 max-w-2xl">
            <label className="relative" htmlFor="shop-search">
              <span className="sr-only">Search products</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666] pointer-events-none"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z" /></svg>
              <input id="shop-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search name, brand, size…" className="w-full bg-[#151515] border border-white/20 text-white text-sm pl-10 pr-3 py-3 outline-none focus:border-[#E8500A] placeholder:text-white/40" />
            </label>
            <label htmlFor="shop-sort">
              <span className="sr-only">Sort products</span>
              <select id="shop-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="h-full bg-[#151515] border border-white/20 text-white text-xs uppercase tracking-wider px-3 outline-none focus:border-[#E8500A]">
                <option value="newest">Newest</option>
                <option value="price-low">Price: low</option>
                <option value="price-high">Price: high</option>
              </select>
            </label>
          </div>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {activeChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1.5 bg-[#E8500A]/15 border border-[#E8500A]/40 text-[#E8500A] text-[10px] font-bold tracking-wider uppercase px-3 py-1"
                >
                  {displayGender(chip)}
                  <button
                    onClick={() => {
                      if (chip === "Mens" || chip === "Womens") setSelectedGender("All");
                      else if (chip.startsWith("Size ")) setSelectedSizes((p) => p.filter((s) => `Size ${s}` !== chip));
                      else if (chip.startsWith("Fit: ")) setSelectedFits((p) => p.filter((f) => `Fit: ${f}` !== chip));
                      else setSelectedCategories((p) => p.filter((c) => c !== chip));
                    }}
                    className="opacity-60 hover:opacity-100 transition-opacity ml-0.5"
                    aria-label={`Remove ${displayGender(chip)}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <button onClick={sidebarProps.onClear}
                className="text-[#555] text-[10px] uppercase tracking-widest hover:text-[#aaa] transition-colors px-1">
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-10">
          <div className="hidden lg:block">
            <Sidebar {...sidebarProps} />
          </div>

          <div className="flex-1 min-w-0">
            {filtered.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-white/10">
                <p className="text-5xl mb-5 opacity-30">🔍</p>
                <p className="text-white font-bold text-lg mb-2">No items match</p>
                <p className="text-[#555] text-sm mb-6">Try removing some filters</p>
                <button
                  onClick={sidebarProps.onClear}
                  className="text-xs text-[#E8500A] border border-[#E8500A] px-6 py-2.5 font-bold tracking-widest uppercase hover:bg-[#E8500A] hover:text-white transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filtered.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => setSelectedProduct(product)}
                  />
                ))}
              </div>
            )}

            <div className="mt-12 text-center border border-white/8 py-10 px-4">
              <p className="text-[#aaa] text-sm mb-1">Looking for more?</p>
              <p className="text-white font-bold mb-6">Browse our full Vinted store</p>
              <a
                href="https://www.vinted.co.uk/member/59714764-stackedracks"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-[#F5C300] text-[#F5C300] font-black text-xs tracking-[0.2em] uppercase px-8 py-3.5 hover:bg-[#F5C300]/10 transition-colors"
              >
                VIEW ALL ON VINTED →
              </a>
            </div>
          </div>
        </div>
      </div>

      <MobileFilterDrawer {...sidebarProps} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}

      <Footer />
    </div>
  );
}

export default function ShopPageClient({ initialProducts }: { initialProducts: Product[] }) {
  return (
    <Suspense>
      <ShopContent initialProducts={initialProducts} />
    </Suspense>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ALL_BRANDS,
  CATEGORIES,
  ERAS,
  FITS,
  SIZES,
  type Condition,
  type Era,
  type Fit,
  type Product,
} from "@/lib/products";

type Tab = "orders" | "listings";

interface OrderRow {
  id: string;
  source: string;
  item_name: string;
  brand: string;
  price: number | string;
  postage: number | string;
  total: number | string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  payment_status: string;
  notes: string;
  date_of_sale: string;
}

const EMPTY_PRODUCT: Omit<Product, "id"> = {
  name: "",
  brand: "",
  size: "M",
  gender: "Mens",
  price: 0,
  category: "Jackets",
  badge: "NEW",
  stock: 1,
  condition: "Good",
  era: "90s",
  fit: "Regular",
  listedDate: new Date().toISOString().slice(0, 10),
  description: "",
  imageUrls: [],
  vintedTitle: "",
  vintedDescription: "",
};

const INPUT = "w-full bg-[#171717] border border-white/10 text-white text-sm px-3 py-2.5 outline-none focus:border-[#E8500A]/70 placeholder:text-[#444]";
const LABEL = "block text-[#666] text-[9px] font-black tracking-[0.18em] uppercase mb-1.5";

const LISTING_WORDS = [
  ...ALL_BRANDS,
  "jacket",
  "hoodie",
  "sweatshirt",
  "shirt",
  "jersey",
  "tracksuit",
  "trousers",
  "joggers",
  "shorts",
  "jeans",
  "denim",
  "leather",
  "bomber",
  "puffer",
  "knit",
  "sweater",
  "top",
  "vintage",
  "retro",
  "rare",
  "archive",
  "oversized",
  "baggy",
  "fitted",
  "excellent",
  "condition",
  "black",
  "white",
  "blue",
  "navy",
  "red",
  "green",
  "brown",
  "beige",
  "grey",
  "orange",
  "yellow",
  "purple",
  "pink",
] as const;

const QUICK_CATEGORIES = [
  { words: ["t-shirt", "tshirt", "tee"], category: "T-Shirts & Tops", item: "T-Shirt" },
  { words: ["hoodie"], category: "Hoodies", item: "Hoodie" },
  { words: ["bomber"], category: "Jackets", item: "Bomber Jacket" },
  { words: ["puffer"], category: "Jackets", item: "Puffer Jacket" },
  { words: ["jacket", "coat"], category: "Jackets", item: "Jacket" },
  { words: ["sweatshirt", "sweater", "jumper", "knit"], category: "Sweatshirts", item: "Sweatshirt" },
  { words: ["tracksuit"], category: "Tracksuits", item: "Tracksuit" },
  { words: ["joggers", "jogger"], category: "Joggers & Tracksuit Bottoms", item: "Joggers" },
  { words: ["trousers", "trouser", "pants"], category: "Trousers", item: "Trousers" },
  { words: ["shorts", "short"], category: "Shorts", item: "Shorts" },
  { words: ["football shirt", "jersey"], category: "Football Shirts", item: "Football Shirt" },
  { words: ["cap", "hat", "beanie"], category: "Headwear", item: "Headwear" },
  { words: ["backpack", "bag"], category: "Bags & Backpacks", item: "Bag" },
  { words: ["swimwear", "swimsuit"], category: "Swimwear", item: "Swimwear" },
  { words: ["trainers", "trainer", "shoes", "shoe"], category: "Shoes", item: "Shoes" },
] as const;

function parseQuickListing(details: string, current: Omit<Product, "id">): Partial<Omit<Product, "id">> {
  const text = details.toLowerCase().replaceAll("’", "'");
  const parsed: Partial<Omit<Product, "id">> = {};
  const brand = ALL_BRANDS.find((item) => text.includes(item.toLowerCase()));
  const categoryMatch = QUICK_CATEGORIES.find((item) => item.words.some((word) => text.includes(word)));
  const sizeMatches: Array<[RegExp, string]> = [
    [/\b(?:xxl|2xl|extra extra large)\b/, "XXL"],
    [/\b(?:xl|extra large)\b/, "XL"],
    [/\b(?:xs|extra small)\b/, "XS"],
    [/\b(?:large|size l)\b/, "L"],
    [/\b(?:medium|size m)\b/, "M"],
    [/\b(?:small|size s)\b/, "S"],
  ];
  const size = sizeMatches.find(([pattern]) => pattern.test(text))?.[1];
  const eraMatch = text.match(/\b(?:19|20)?(60|70|80|90|00|10|20)s\b/);
  const priceMatch = details.match(/(?:£|gbp\s*)(\d+(?:\.\d{1,2})?)/i);

  if (brand) parsed.brand = brand;
  if (categoryMatch) parsed.category = categoryMatch.category;
  if (size) parsed.size = size;
  if (/\b(?:women|womens|women's|female)\b/.test(text)) parsed.gender = "Womens";
  else if (/\b(?:men|mens|men's|male)\b/.test(text)) parsed.gender = "Mens";
  if (eraMatch) parsed.era = `${eraMatch[1]}s` as Era;
  if (/\bexcellent\b/.test(text)) parsed.condition = "Excellent";
  else if (/\bfair\b/.test(text)) parsed.condition = "Fair";
  else if (/\bgood\b/.test(text)) parsed.condition = "Good";
  if (/\boversized\b/.test(text)) parsed.fit = "Oversized";
  else if (/\bbaggy\b/.test(text)) parsed.fit = "Baggy";
  else if (/\bfitted\b/.test(text)) parsed.fit = "Fitted";
  else if (/\bregular\b/.test(text)) parsed.fit = "Regular";
  if (priceMatch) parsed.price = Number(priceMatch[1]);
  if (/\b(?:marquee|rare|archive|grail|one of one|1 of 1)\b/.test(text)) {
    parsed.badge = "RARE";
    parsed.rareBadge = "ARCHIVE";
  }

  const titleParts = [brand ?? current.brand, parsed.era ?? current.era, categoryMatch?.item].filter(Boolean);
  if (titleParts.length >= 2) {
    parsed.name = titleParts.join(" ");
    parsed.vintedTitle = titleParts.join(" ");
  }
  return parsed;
}

function money(value: number | string) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadHmrcCsv(orders: OrderRow[]) {
  const headers = ["Date", "Order ID", "Item", "Brand", "Sale Price", "Postage", "Total", "Customer Name"];
  const rows = orders.map((order) => [
    new Date(order.date_of_sale).toLocaleDateString("en-GB"),
    order.id,
    csvCell(order.item_name),
    csvCell(order.brand),
    Number(order.price).toFixed(2),
    Number(order.postage).toFixed(2),
    Number(order.total).toFixed(2),
    csvCell(order.customer_name),
  ]);
  const blob = new Blob([[headers.join(","), ...rows.map((row) => row.join(","))].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `stacked-racks-hmrc-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");
  const [search, setSearch] = useState("");
  const [showManualSale, setShowManualSale] = useState(false);
  const [thirtyDaysAgo] = useState(() => Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [manualSale, setManualSale] = useState({ customer_name: "", item_name: "", brand: "", price: 0, postage: 0, total: 0, notes: "Vinted sale" });

  const [form, setForm] = useState<Omit<Product, "id">>(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quickDetails, setQuickDetails] = useState("");
  const [photoAnalysis, setPhotoAnalysis] = useState("");
  const [sellerNotes, setSellerNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listingMessage, setListingMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoadingData(true);
    setDataError("");
    try {
      const [ordersResponse, productsResponse] = await Promise.all([
        fetch("/api/admin-orders", { cache: "no-store" }),
        fetch("/api/products", { cache: "no-store" }),
      ]);
      if (ordersResponse.status === 401) {
        setAuthenticated(false);
        return;
      }
      const ordersData = await ordersResponse.json();
      const productsData = await productsResponse.json();
      if (!ordersResponse.ok) throw new Error(ordersData.error ?? "Could not load orders");
      setOrders(ordersData.orders ?? []);
      setProducts(productsData.products ?? []);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Could not load dashboard data");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setAuthenticated(Boolean(data.authenticated));
        setConfigured(Boolean(data.configured));
        if (data.authenticated) void loadDashboard();
      })
      .finally(() => setCheckingAuth(false));
  }, [loadDashboard]);

  const handleLogin = async () => {
    setLoginError("");
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (!response.ok) {
      setLoginError(data.error ?? "Could not sign in");
      return;
    }
    setPassword("");
    setAuthenticated(true);
    await loadDashboard();
  };

  const handleLogout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
  };

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) => `${order.id} ${order.customer_name} ${order.item_name} ${order.brand}`.toLowerCase().includes(query));
  }, [orders, search]);

  const paidOrders = orders.filter((order) => order.payment_status === "paid");
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const recentRevenue = paidOrders
    .filter((order) => new Date(order.date_of_sale).getTime() >= thirtyDaysAgo)
    .reduce((sum, order) => sum + Number(order.total), 0);

  const recordManualSale = async () => {
    const total = manualSale.total || manualSale.price + manualSale.postage;
    const response = await fetch("/api/admin-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...manualSale, total, payment_status: "paid" }),
    });
    const data = await response.json();
    if (!response.ok) return setDataError(data.error ?? "Could not save sale");
    setShowManualSale(false);
    setManualSale({ customer_name: "", item_name: "", brand: "", price: 0, postage: 0, total: 0, notes: "Vinted sale" });
    await loadDashboard();
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setListingMessage("");
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 6 - (form.imageUrls?.length ?? 0))) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/admin/upload", { method: "POST", body });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? `Could not upload ${file.name}`);
        urls.push(data.url);
      }
      setForm((current) => ({ ...current, imageUrls: [...(current.imageUrls ?? []), ...urls] }));
      setListingMessage(`${urls.length} photo${urls.length === 1 ? "" : "s"} uploaded`);
    } catch (error) {
      setListingMessage(error instanceof Error ? error.message : "Photo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const generateListing = async (overrides: Partial<Omit<Product, "id">> = {}, notesOverride?: string, mode: "listing" | "photos" = "listing") => {
    setGenerating(true);
    setListingMessage("");
    const listingForm = { ...form, ...overrides };
    const combinedNotes = [
      mode === "listing" && photoAnalysis ? `Previous photo analysis: ${photoAnalysis}` : "",
      notesOverride ?? sellerNotes,
    ].filter(Boolean).join("\n\n");
    try {
      const response = await fetch("/api/generate-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: mode === "photos" ? "" : listingForm.brand,
          category: mode === "photos" ? "" : listingForm.category,
          era: mode === "photos" ? "" : listingForm.era,
          condition: mode === "photos" ? "" : listingForm.condition,
          size: mode === "photos" ? "" : listingForm.size,
          fit: mode === "photos" ? "" : listingForm.fit,
          gender: mode === "photos" ? "" : listingForm.gender,
          badge: mode === "photos" ? "NEW" : listingForm.badge,
          notes: combinedNotes,
          imageUrls: listingForm.imageUrls,
          mode,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "AI generation failed");
      setForm((current) => ({
        ...current,
        ...overrides,
        name: data.websiteTitle || overrides.name || current.name,
        description: data.websiteDescription || overrides.description || current.description,
        vintedTitle: data.vintedTitle || overrides.vintedTitle || current.vintedTitle,
        vintedDescription: data.vintedDescription || overrides.vintedDescription || current.vintedDescription,
        brand: data.suggestedBrand || overrides.brand || current.brand,
        category: CATEGORIES.includes(data.suggestedCategory) ? data.suggestedCategory : overrides.category || current.category,
        era: ERAS.includes(data.suggestedEra) ? data.suggestedEra : overrides.era || current.era,
        condition: (["Excellent", "Good", "Fair"] as const).includes(data.suggestedCondition) ? data.suggestedCondition : overrides.condition || current.condition,
        size: SIZES.includes(data.suggestedSize) ? data.suggestedSize : overrides.size || current.size,
        gender: (["Mens", "Womens"] as const).includes(data.suggestedGender) ? data.suggestedGender : overrides.gender || current.gender,
        fit: FITS.includes(data.suggestedFit) ? data.suggestedFit : overrides.fit || current.fit,
        badge: mode === "photos" ? (String(data.suggestedMarquee).toLowerCase() === "yes" ? "RARE" : "NEW") : overrides.badge || current.badge,
        rareBadge: mode === "photos" ? (String(data.suggestedMarquee).toLowerCase() === "yes" ? "ARCHIVE" : undefined) : overrides.rareBadge ?? current.rareBadge,
      }));
      if (mode === "photos") setPhotoAnalysis(data.photoFindings || "Photos analysed successfully.");
      setListingMessage(mode === "photos" ? "Pictures analysed and fields populated — add any extra details above, then merge with AI" : "Draft generated — check the details before publishing");
    } catch (error) {
      setListingMessage(error instanceof Error ? error.message : "AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const generateQuickListing = async () => {
    const parsed = parseQuickListing(quickDetails, form);
    setForm((current) => ({ ...current, ...parsed }));
    setSellerNotes(quickDetails);
    await generateListing(parsed, quickDetails);
  };

  const analysePhotos = async () => {
    await generateListing({}, quickDetails || sellerNotes, "photos");
  };

  const saveProduct = async () => {
    setSaving(true);
    setListingMessage("");
    try {
      const productForSave = {
        ...form,
        listedDate: editingId ? form.listedDate : new Date().toISOString().slice(0, 10),
      };
      const response = await fetch("/api/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, product: productForSave } : productForSave),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save product");
      setListingMessage(editingId ? "Product updated" : "Product published to the website");
      setEditingId(null);
      setForm({ ...EMPTY_PRODUCT, listedDate: new Date().toISOString().slice(0, 10) });
      setQuickDetails("");
      setPhotoAnalysis("");
      setSellerNotes("");
      await loadDashboard();
      window.dispatchEvent(new CustomEvent("sr:products-updated"));
    } catch (error) {
      setListingMessage(error instanceof Error ? error.message : "Could not save product");
    } finally {
      setSaving(false);
    }
  };

  const editProduct = (product: Product) => {
    const { id, ...details } = product;
    setEditingId(String(id));
    setForm({ ...EMPTY_PRODUCT, ...details, imageUrls: details.imageUrls ?? [] });
    setQuickDetails("");
    setPhotoAnalysis("");
    setSellerNotes("");
    setTab("listings");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateStock = async (product: Product) => {
    const { id, ...details } = product;
    const response = await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, product: { ...details, stock: product.stock > 0 ? 0 : 1 } }),
    });
    if (response.ok) await loadDashboard();
  };

  const removeProduct = async (product: Product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    const response = await fetch(`/api/products?id=${encodeURIComponent(String(product.id))}`, { method: "DELETE" });
    if (response.ok) await loadDashboard();
  };

  if (checkingAuth) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-[#666]">Checking admin access…</div>;
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#111] border border-white/10 p-7">
          <p className="text-[#E8500A] text-[10px] font-black tracking-[0.3em] uppercase mb-3">Private area</p>
          <h1 className="text-white text-2xl font-black mb-1">Stacked Racks Admin</h1>
          <p className="text-[#666] text-sm mb-6">Orders, listings and HMRC exports.</p>
          {!configured && <p className="text-amber-300 text-xs bg-amber-500/10 border border-amber-500/20 p-3 mb-4">Admin password still needs to be configured on Vercel.</p>}
          <label className={LABEL}>Admin password</label>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void handleLogin()} className={`${INPUT} mb-3`} />
          {loginError && <p className="text-red-400 text-xs mb-3">{loginError}</p>}
          <button onClick={handleLogin} disabled={!password || !configured} className="w-full bg-[#E8500A] disabled:opacity-40 text-white font-black text-xs tracking-[0.2em] uppercase py-3">Sign in</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-30 bg-[#0d0d0d]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="font-black tracking-widest text-sm">STACKED RACKS — ADMIN</h1><p className="text-[#555] text-[10px] mt-1">Live shop management</p></div>
          <nav className="flex gap-1">
            {(["orders", "listings"] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`px-4 py-2 text-[10px] font-black tracking-[0.16em] uppercase border ${tab === item ? "bg-[#E8500A] border-[#E8500A]" : "border-white/10 text-[#777]"}`}>{item === "orders" ? "Sales" : "Listing studio"}</button>)}
          </nav>
          <button onClick={handleLogout} className="text-[#666] hover:text-white text-xs">Sign out</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
        {dataError && <div className="border border-red-500/30 bg-red-500/10 text-red-300 text-sm p-4 mb-5">{dataError}</div>}
        {loadingData && <p className="text-[#666] text-xs mb-4">Refreshing live data…</p>}

        {tab === "orders" && (
          <section>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
              {[{ label: "Paid orders", value: paidOrders.length }, { label: "All-time revenue", value: money(revenue) }, { label: "Last 30 days", value: money(recentRevenue) }, { label: "Live products", value: products.filter((product) => product.stock > 0).length }].map((stat) => <div key={stat.label} className="bg-[#111] border border-white/8 p-5"><p className="text-[#555] text-[9px] uppercase tracking-[0.2em] mb-2">{stat.label}</p><p className="text-2xl font-black">{stat.value}</p></div>)}
            </div>
            <div className="flex flex-wrap gap-3 items-center mb-4">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, item or order…" className={`${INPUT} sm:max-w-xs`} />
              <button onClick={() => setShowManualSale(true)} className="bg-[#E8500A] px-4 py-2.5 text-[10px] font-black tracking-wider uppercase">Record Vinted sale</button>
              <button onClick={() => downloadHmrcCsv(orders)} className="border border-[#F5C300]/40 text-[#F5C300] px-4 py-2.5 text-[10px] font-black tracking-wider uppercase">Export HMRC CSV</button>
              <button onClick={loadDashboard} className="border border-white/10 text-[#888] px-4 py-2.5 text-[10px] font-black tracking-wider uppercase">Refresh</button>
            </div>
            <div className="bg-[#111] border border-white/8 overflow-x-auto">
              <table className="w-full min-w-[940px] text-left">
                <thead><tr className="border-b border-white/10">{["Date", "Order", "Customer", "Item", "Source", "Status", "Total"].map((heading) => <th key={heading} className="px-4 py-3 text-[#555] text-[9px] tracking-[0.18em] uppercase">{heading}</th>)}</tr></thead>
                <tbody>{filteredOrders.map((order) => <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02]"><td className="px-4 py-3 text-[#777] text-xs">{new Date(order.date_of_sale).toLocaleDateString("en-GB")}</td><td className="px-4 py-3 text-[#E8500A] text-xs font-bold">{order.id}</td><td className="px-4 py-3"><p className="text-sm font-semibold">{order.customer_name}</p><p className="text-[#555] text-[10px]">{order.customer_email}</p></td><td className="px-4 py-3"><p className="text-sm">{order.item_name}</p><p className="text-[#555] text-[10px]">{order.brand}</p></td><td className="px-4 py-3 text-[#777] text-xs uppercase">{order.source}</td><td className="px-4 py-3"><span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[9px] uppercase">{order.payment_status}</span></td><td className="px-4 py-3 font-black">{money(order.total)}</td></tr>)}</tbody>
              </table>
              {!filteredOrders.length && <p className="text-[#555] text-center py-14">No sales recorded yet.</p>}
            </div>
          </section>
        )}

        {tab === "listings" && (
          <section className="grid xl:grid-cols-[1fr_380px] gap-6 items-start">
            <div className="space-y-5">
              <div className="bg-[#111] border border-white/8 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 mb-5"><div><p className="text-[#E8500A] text-[9px] font-black tracking-[0.25em] uppercase mb-2">Photo-first listing</p><h2 className="text-xl font-black">{editingId ? "Edit product" : "Create a product"}</h2><p className="text-[#666] text-xs mt-1">Upload the photos, let AI read them, then add anything it could not see.</p></div>{editingId && <button onClick={() => { setEditingId(null); setForm(EMPTY_PRODUCT); setQuickDetails(""); setPhotoAnalysis(""); setSellerNotes(""); }} className="text-[#777] text-xs">Cancel edit</button>}</div>
                <label className="block border-2 border-dashed border-white/10 hover:border-[#E8500A]/50 p-7 text-center cursor-pointer mb-4"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple className="hidden" onChange={(event) => void uploadPhotos(event.target.files)} disabled={uploading} /><span className="text-sm font-bold">{uploading ? "Uploading photos…" : "Choose product photos"}</span><span className="block text-[#555] text-[10px] mt-1">JPG, PNG, WEBP or HEIC · 4MB each</span></label>
                {!!form.imageUrls?.length && <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">{form.imageUrls.map((url, index) => <div key={url} className="relative aspect-[3/4] bg-[#1a1a1a]"><img src={url} alt={`Product photo ${index + 1}`} className="w-full h-full object-cover" /><button onClick={() => setForm({ ...form, imageUrls: form.imageUrls?.filter((item) => item !== url) })} className="absolute top-1 right-1 bg-black/80 w-6 h-6 text-xs">×</button></div>)}</div>}
                <div className="mb-5 flex flex-wrap items-center gap-3"><button onClick={() => void analysePhotos()} disabled={generating || !form.imageUrls?.length} className="bg-[#E8500A] disabled:opacity-40 text-white font-black text-xs tracking-[0.16em] uppercase px-5 py-3">{generating ? "Reading pictures…" : "Analyse pictures"}</button><span className="text-[#666] text-[10px]">Reads labels, logos, colours, item details and visible condition. Paid web search stays off.</span></div>
                {photoAnalysis && <div className="mb-5 border border-[#E8500A]/25 bg-[#E8500A]/[0.05] p-4"><p className="text-[#E8500A] text-[9px] font-black tracking-[0.18em] uppercase mb-2">What the pictures show</p><p className="text-[#bbb] text-xs leading-relaxed">{photoAnalysis}</p></div>}
                <div className="mb-5 border border-[#F5C300]/25 bg-[#F5C300]/[0.04] p-4">
                  <label className="block text-[#F5C300] text-[10px] font-black tracking-[0.2em] uppercase mb-2">Quick listing — add what the photos cannot show</label>
                  <AutocompleteControl label="Quick listing details" value={quickDetails} onChange={setQuickDetails} rows={3} multiline placeholder="Example: Nike, jacket, medium, mens, 90s, black, good condition, £65" suggestions={LISTING_WORDS} />
                  <div className="mt-3 flex flex-wrap items-center gap-3"><button onClick={() => void generateQuickListing()} disabled={generating || quickDetails.trim().length < 3} className="bg-[#F5C300] disabled:opacity-40 text-black font-black text-xs tracking-[0.14em] uppercase px-5 py-3">{generating ? "Building listing…" : photoAnalysis ? "Merge details with photo analysis" : "Fill every box with AI"}</button><span className="text-[#777] text-[10px]">Include the price with £ if you want that filled too.</span></div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Field label="Brand" value={form.brand} onChange={(value) => setForm({ ...form, brand: value })} placeholder="Nike, Adidas, Vintage…" suggestions={ALL_BRANDS} />
                  <Select label="Category" value={form.category} options={CATEGORIES} onChange={(value) => setForm({ ...form, category: value })} />
                  <Select label="Size" value={form.size} options={SIZES} onChange={(value) => setForm({ ...form, size: value })} />
                  <Select label="Department" value={form.gender} options={["Mens", "Womens"]} onChange={(value) => setForm({ ...form, gender: value as Product["gender"] })} />
                  <Field label="Price (£)" value={form.price || ""} type="number" onChange={(value) => setForm({ ...form, price: Number(value) })} />
                  <Select label="Era" value={form.era} options={ERAS} onChange={(value) => setForm({ ...form, era: value as Era })} />
                  <Select label="Condition" value={form.condition} options={["Excellent", "Good", "Fair"]} onChange={(value) => setForm({ ...form, condition: value as Condition })} />
                  <Select label="Fit" value={form.fit} options={FITS} onChange={(value) => setForm({ ...form, fit: value as Fit })} />
                </div>
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                  <label className="flex items-start gap-3 border border-white/10 bg-[#171717] p-4 cursor-pointer"><input type="checkbox" checked={form.badge === "RARE"} onChange={(event) => setForm({ ...form, badge: event.target.checked ? "RARE" : "NEW", rareBadge: event.target.checked ? "ARCHIVE" : undefined })} className="mt-0.5 accent-[#E8500A]" /><span><span className="block text-sm font-bold">Show in Marquee</span><span className="block text-[#666] text-[10px] mt-1">Use this for a featured standout piece.</span></span></label>
                  <div className="border border-[#F5C300]/20 bg-[#F5C300]/[0.04] p-4"><p className="text-[#F5C300] text-[9px] font-black tracking-[0.16em] uppercase mb-1">New In — automatic</p><p className="text-[#777] text-[10px] leading-relaxed">Every newly published item stays in New In for 14 days. It then leaves New In automatically but remains in the full shop.</p></div>
                </div>
                <div className="mt-4"><label className={LABEL}>Notes for the AI</label><AutocompleteControl label="Notes for the AI" value={sellerNotes} onChange={setSellerNotes} rows={3} multiline placeholder="Colour, measurements, flaws, label details, fabric if known…" suggestions={LISTING_WORDS} /></div>
                <p className="text-[#555] text-[10px] mt-2">Typing help: enter two letters, then press Tab or → to complete the suggested word.</p>
                <button onClick={() => void generateListing()} disabled={generating || (!form.imageUrls?.length && !form.brand)} className="mt-4 border border-[#F5C300]/40 text-[#F5C300] disabled:opacity-40 font-black text-xs tracking-[0.16em] uppercase px-5 py-3">{generating ? "Writing copy…" : "Regenerate copy from current details"}</button>
              </div>

              <div className="bg-[#111] border border-white/8 p-5 sm:p-6 space-y-4">
                <h3 className="font-black">Review and publish</h3>
                <Field label="Website title" value={form.name} onChange={(value) => setForm({ ...form, name: value })} suggestions={LISTING_WORDS} />
                <TextArea label="Website description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} suggestions={LISTING_WORDS} />
                <CopyField label="Vinted title" value={form.vintedTitle ?? ""} onChange={(value) => setForm({ ...form, vintedTitle: value })} suggestions={LISTING_WORDS} />
                <CopyField label="Vinted description" value={form.vintedDescription ?? ""} onChange={(value) => setForm({ ...form, vintedDescription: value })} area suggestions={LISTING_WORDS} />
                {listingMessage && <p className="text-[#F5C300] text-xs border border-[#F5C300]/20 bg-[#F5C300]/5 p-3">{listingMessage}</p>}
                <div className="flex flex-wrap gap-3"><button onClick={saveProduct} disabled={saving || !form.name || !form.brand || form.price <= 0} className="bg-[#E8500A] disabled:opacity-40 font-black text-xs tracking-[0.16em] uppercase px-6 py-3">{saving ? "Saving…" : editingId ? "Save changes" : "Publish to website"}</button><button onClick={() => navigator.clipboard.writeText(`${form.vintedTitle}\n\n${form.vintedDescription}`)} className="border border-white/15 text-[#aaa] px-5 py-3 text-xs font-bold">Copy full Vinted listing</button><a href="https://www.vinted.co.uk/items/new" target="_blank" rel="noopener noreferrer" className="border border-[#F5C300]/40 text-[#F5C300] px-5 py-3 text-xs font-bold">Open Vinted ↗</a></div>
              </div>
            </div>

            <aside className="bg-[#111] border border-white/8 p-5 xl:sticky xl:top-24">
              <h3 className="font-black mb-1">Website products</h3><p className="text-[#555] text-xs mb-4">Products uploaded through this dashboard.</p>
              <div className="space-y-3 max-h-[72vh] overflow-y-auto">{products.map((product) => <div key={product.id} className="border border-white/8 p-3 flex gap-3"><div className="w-16 h-20 bg-[#1a1a1a] shrink-0 overflow-hidden">{product.imageUrls?.[0] && <img src={product.imageUrls[0]} alt="" className="w-full h-full object-cover" />}</div><div className="min-w-0 flex-1"><p className="text-sm font-bold truncate">{product.name}</p><p className="text-[#666] text-[10px]">{product.brand} · {money(product.price)}</p><p className={`text-[9px] mt-1 ${product.stock > 0 ? "text-emerald-400" : "text-red-400"}`}>{product.stock > 0 ? "LIVE" : "SOLD"}</p><div className="flex gap-3 mt-2"><button onClick={() => editProduct(product)} className="text-[#E8500A] text-[10px]">Edit</button><button onClick={() => void updateStock(product)} className="text-[#aaa] text-[10px]">{product.stock > 0 ? "Mark sold" : "Relist"}</button><button onClick={() => void removeProduct(product)} className="text-red-400 text-[10px]">Delete</button></div></div></div>)}</div>
              {!products.length && <p className="text-[#555] text-xs py-8 text-center">No dashboard products yet.</p>}
            </aside>
          </section>
        )}
      </div>

      {showManualSale && <Modal title="Record a Vinted or manual sale" onClose={() => setShowManualSale(false)}><div className="grid sm:grid-cols-2 gap-4"><Field label="Customer name" value={manualSale.customer_name} onChange={(value) => setManualSale({ ...manualSale, customer_name: value })} /><Field label="Item" value={manualSale.item_name} onChange={(value) => setManualSale({ ...manualSale, item_name: value })} /><Field label="Brand" value={manualSale.brand} onChange={(value) => setManualSale({ ...manualSale, brand: value })} /><Field label="Sale price" value={manualSale.price || ""} type="number" onChange={(value) => setManualSale({ ...manualSale, price: Number(value) })} /><Field label="Postage" value={manualSale.postage || ""} type="number" onChange={(value) => setManualSale({ ...manualSale, postage: Number(value) })} /><Field label="Notes" value={manualSale.notes} onChange={(value) => setManualSale({ ...manualSale, notes: value })} /></div><button onClick={recordManualSale} disabled={!manualSale.customer_name || !manualSale.item_name || manualSale.price <= 0} className="w-full mt-5 bg-[#E8500A] disabled:opacity-40 py-3 font-black text-xs tracking-wider uppercase">Save sale</button></Modal>}
    </main>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", suggestions }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string; suggestions?: readonly string[] }) {
  return <label><span className={LABEL}>{label}</span>{type === "text" && suggestions ? <AutocompleteControl label={label} value={String(value)} onChange={onChange} placeholder={placeholder} suggestions={suggestions} /> : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} step={type === "number" ? "0.01" : undefined} className={INPUT} />}</label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return <label><span className={LABEL}>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={INPUT}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function TextArea({ label, value, onChange, suggestions }: { label: string; value: string; onChange: (value: string) => void; suggestions?: readonly string[] }) {
  return <label><span className={LABEL}>{label}</span><AutocompleteControl label={label} value={value} onChange={onChange} rows={4} multiline suggestions={suggestions} /></label>;
}

function CopyField({ label, value, onChange, area = false, suggestions }: { label: string; value: string; onChange: (value: string) => void; area?: boolean; suggestions?: readonly string[] }) {
  return <div><div className="flex justify-between items-center"><span className={LABEL}>{label}</span><button onClick={() => navigator.clipboard.writeText(value)} className="text-[#E8500A] text-[10px] mb-1.5">Copy</button></div><AutocompleteControl label={label} value={value} onChange={onChange} rows={area ? 7 : undefined} multiline={area} suggestions={suggestions} /></div>;
}

function AutocompleteControl({ label, value, onChange, suggestions = [], multiline = false, rows, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; suggestions?: readonly string[]; multiline?: boolean; rows?: number; placeholder?: string }) {
  const [focused, setFocused] = useState(false);
  const wordMatch = value.match(/([A-Za-z][A-Za-z'-]*)$/);
  const partial = wordMatch?.[1] ?? "";
  const suggestion = partial.length >= 2
    ? suggestions.find((word) => word.toLowerCase().startsWith(partial.toLowerCase()) && word.toLowerCase() !== partial.toLowerCase())
    : undefined;

  const acceptSuggestion = () => {
    if (!suggestion || wordMatch?.index === undefined) return;
    onChange(`${value.slice(0, wordMatch.index)}${suggestion} `);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (suggestion && (event.key === "Tab" || event.key === "ArrowRight")) {
      event.preventDefault();
      acceptSuggestion();
    }
  };

  const controlProps = {
    "aria-label": label,
    value,
    placeholder,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    onKeyDown: handleKeyDown,
    onFocus: () => setFocused(true),
    onBlur: () => window.setTimeout(() => setFocused(false), 120),
    className: INPUT,
  };

  return <div className="relative">
    {multiline ? <textarea {...controlProps} rows={rows ?? 4} /> : <input {...controlProps} />}
    {focused && suggestion && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={acceptSuggestion} className="absolute z-20 left-0 top-full mt-1 flex w-full items-center justify-between gap-3 border border-[#E8500A]/30 bg-[#202020] px-3 py-2 text-left text-xs shadow-xl">
      <span className="text-white">{suggestion}</span><span className="shrink-0 text-[#777] text-[9px] uppercase tracking-wider">Tab or →</span>
    </button>}
  </div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center" onClick={(event) => event.target === event.currentTarget && onClose()}><div className="w-full max-w-xl bg-[#111] border border-white/10 p-6"><div className="flex justify-between mb-5"><h2 className="font-black">{title}</h2><button onClick={onClose} className="text-[#777]">×</button></div>{children}</div></div>;
}

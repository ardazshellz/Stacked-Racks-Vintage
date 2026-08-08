"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  ERAS,
  FITS,
  SIZES,
  type Condition,
  type Era,
  type Fit,
  type Product,
  type RareBadge,
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

  const generateListing = async () => {
    setGenerating(true);
    setListingMessage("");
    try {
      const response = await fetch("/api/generate-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: form.brand,
          category: form.category,
          era: form.era,
          condition: form.condition,
          size: form.size,
          fit: form.fit,
          gender: form.gender,
          badge: form.badge,
          notes: sellerNotes,
          imageUrls: form.imageUrls,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "AI generation failed");
      setForm((current) => ({
        ...current,
        name: data.websiteTitle || current.name,
        description: data.websiteDescription || current.description,
        vintedTitle: data.vintedTitle || current.vintedTitle,
        vintedDescription: data.vintedDescription || current.vintedDescription,
        brand: data.suggestedBrand || current.brand,
        category: CATEGORIES.includes(data.suggestedCategory) ? data.suggestedCategory : current.category,
        era: ERAS.includes(data.suggestedEra) ? data.suggestedEra : current.era,
        condition: (["Excellent", "Good", "Fair"] as const).includes(data.suggestedCondition) ? data.suggestedCondition : current.condition,
      }));
      setListingMessage("Draft generated — check the details before publishing");
    } catch (error) {
      setListingMessage(error instanceof Error ? error.message : "AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const saveProduct = async () => {
    setSaving(true);
    setListingMessage("");
    try {
      const response = await fetch("/api/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, product: form } : form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save product");
      setListingMessage(editingId ? "Product updated" : "Product published to the website");
      setEditingId(null);
      setForm({ ...EMPTY_PRODUCT, listedDate: new Date().toISOString().slice(0, 10) });
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
                <div className="flex items-start justify-between gap-4 mb-5"><div><p className="text-[#E8500A] text-[9px] font-black tracking-[0.25em] uppercase mb-2">Photo-first listing</p><h2 className="text-xl font-black">{editingId ? "Edit product" : "Create a product"}</h2><p className="text-[#666] text-xs mt-1">Upload up to six photos, add what you know, then generate the copy.</p></div>{editingId && <button onClick={() => { setEditingId(null); setForm(EMPTY_PRODUCT); }} className="text-[#777] text-xs">Cancel edit</button>}</div>
                <label className="block border-2 border-dashed border-white/10 hover:border-[#E8500A]/50 p-7 text-center cursor-pointer mb-4"><input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple className="hidden" onChange={(event) => void uploadPhotos(event.target.files)} disabled={uploading} /><span className="text-sm font-bold">{uploading ? "Uploading photos…" : "Choose product photos"}</span><span className="block text-[#555] text-[10px] mt-1">JPG, PNG, WEBP or HEIC · 4MB each</span></label>
                {!!form.imageUrls?.length && <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">{form.imageUrls.map((url, index) => <div key={url} className="relative aspect-[3/4] bg-[#1a1a1a]"><img src={url} alt={`Product photo ${index + 1}`} className="w-full h-full object-cover" /><button onClick={() => setForm({ ...form, imageUrls: form.imageUrls?.filter((item) => item !== url) })} className="absolute top-1 right-1 bg-black/80 w-6 h-6 text-xs">×</button></div>)}</div>}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Field label="Brand" value={form.brand} onChange={(value) => setForm({ ...form, brand: value })} placeholder="Nike, Adidas, Vintage…" />
                  <Select label="Category" value={form.category} options={CATEGORIES} onChange={(value) => setForm({ ...form, category: value })} />
                  <Select label="Size" value={form.size} options={SIZES} onChange={(value) => setForm({ ...form, size: value })} />
                  <Select label="Department" value={form.gender} options={["Mens", "Womens"]} onChange={(value) => setForm({ ...form, gender: value as Product["gender"] })} />
                  <Field label="Price (£)" value={form.price || ""} type="number" onChange={(value) => setForm({ ...form, price: Number(value) })} />
                  <Select label="Era" value={form.era} options={ERAS} onChange={(value) => setForm({ ...form, era: value as Era })} />
                  <Select label="Condition" value={form.condition} options={["Excellent", "Good", "Fair"]} onChange={(value) => setForm({ ...form, condition: value as Condition })} />
                  <Select label="Fit" value={form.fit} options={FITS} onChange={(value) => setForm({ ...form, fit: value as Fit })} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mt-4"><Select label="Badge" value={form.badge} options={["NEW", "RARE"]} onChange={(value) => setForm({ ...form, badge: value as Product["badge"] })} />{form.badge === "RARE" && <Select label="Rare label" value={form.rareBadge ?? "ARCHIVE"} options={["ARCHIVE", "GRAIL", "ERA PIECE"]} onChange={(value) => setForm({ ...form, rareBadge: value as RareBadge })} />}</div>
                <div className="mt-4"><label className={LABEL}>Notes for the AI</label><textarea value={sellerNotes} onChange={(event) => setSellerNotes(event.target.value)} rows={3} placeholder="Colour, measurements, flaws, label details, fabric if known…" className={INPUT} /></div>
                <button onClick={generateListing} disabled={generating || (!form.imageUrls?.length && !form.brand)} className="mt-4 bg-[#F5C300] disabled:opacity-40 text-black font-black text-xs tracking-[0.16em] uppercase px-5 py-3">{generating ? "Analysing photos…" : "Generate website + Vinted copy"}</button>
              </div>

              <div className="bg-[#111] border border-white/8 p-5 sm:p-6 space-y-4">
                <h3 className="font-black">Review and publish</h3>
                <Field label="Website title" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
                <TextArea label="Website description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
                <CopyField label="Vinted title" value={form.vintedTitle ?? ""} onChange={(value) => setForm({ ...form, vintedTitle: value })} />
                <CopyField label="Vinted description" value={form.vintedDescription ?? ""} onChange={(value) => setForm({ ...form, vintedDescription: value })} area />
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

function Field({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label><span className={LABEL}>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} step={type === "number" ? "0.01" : undefined} className={INPUT} /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return <label><span className={LABEL}>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className={INPUT}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className={LABEL}>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className={INPUT} /></label>;
}

function CopyField({ label, value, onChange, area = false }: { label: string; value: string; onChange: (value: string) => void; area?: boolean }) {
  return <div><div className="flex justify-between items-center"><span className={LABEL}>{label}</span><button onClick={() => navigator.clipboard.writeText(value)} className="text-[#E8500A] text-[10px] mb-1.5">Copy</button></div>{area ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={7} className={INPUT} /> : <input value={value} onChange={(event) => onChange(event.target.value)} className={INPUT} />}</div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center" onClick={(event) => event.target === event.currentTarget && onClose()}><div className="w-full max-w-xl bg-[#111] border border-white/10 p-6"><div className="flex justify-between mb-5"><h2 className="font-black">{title}</h2><button onClick={onClose} className="text-[#777]">×</button></div>{children}</div></div>;
}

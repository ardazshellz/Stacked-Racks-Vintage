"use client";

import { useState, useEffect, useCallback } from "react";
import { CATEGORIES, SIZES, FITS, ERAS, ALL_BRANDS, getBrandsInStock, products as staticProducts, type Product, type Era, type Fit, type Condition, type RareBadge } from "@/lib/products";
import { getDynamicProducts, addDynamicProduct, updateDynamicProduct, deleteDynamicProduct } from "@/lib/dynamicProducts";

const ADMIN_PASSWORD = "stackedracks2024";
const STORAGE_KEY = "sr_orders";

type PaymentStatus = "Paid" | "Pending" | "Refunded";

interface Order {
  id: string;
  name: string;
  phone: string;
  address: string;
  itemTitle: string;
  cost: number;
  paid: PaymentStatus;
  dateCompleted: string;
  notes: string;
}

const EMPTY_ORDER: Omit<Order, "id"> = {
  name: "",
  phone: "",
  address: "",
  itemTitle: "",
  cost: 0,
  paid: "Pending",
  dateCompleted: new Date().toISOString().split("T")[0],
  notes: "",
};

function generateId() {
  return `SR-${Date.now().toString(36).toUpperCase()}`;
}

function loadOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveOrders(orders: Order[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function toCSV(orders: Order[]): string {
  const headers = ["Order ID", "Customer Name", "Phone", "Address", "Item", "Cost (£)", "Payment Status", "Date Completed", "Notes"];
  const rows = orders.map((o) => [
    o.id,
    o.name,
    o.phone,
    `"${o.address.replace(/"/g, '""')}"`,
    `"${o.itemTitle.replace(/"/g, '""')}"`,
    o.cost.toFixed(2),
    o.paid,
    o.dateCompleted,
    `"${o.notes.replace(/"/g, '""')}"`,
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function downloadCSV(orders: Order[]) {
  const csv = toCSV(orders);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stacked-racks-orders-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_CLS: Record<PaymentStatus, string> = {
  Paid: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  Pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  Refunded: "bg-red-500/15 text-red-400 border border-red-500/30",
};

// ─── Product form types ───────────────────────────────────────────────────────

const EMPTY_PRODUCT: Omit<Product, "id"> = {
  name: "",
  brand: "",
  size: "M",
  gender: "Mens",
  price: 0,
  category: "Jackets",
  badge: "NEW",
  rareBadge: undefined,
  stock: 1,
  condition: "Good",
  era: "90s",
  fit: "Regular",
  listedDate: new Date().toISOString().split("T")[0],
  description: "",
  editorialStory: undefined,
};

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[10px] font-black tracking-[0.12em] uppercase px-3 py-1.5 border transition-all duration-100 ${
        active ? "bg-[#E8500A] border-[#E8500A] text-white" : "border-white/15 text-[#666] hover:border-white/35 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Admin page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [tab, setTab] = useState<"orders" | "products">("orders");

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Order, "id">>(EMPTY_ORDER);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Products state
  const [dynProducts, setDynProducts] = useState<Product[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productForm, setProductForm] = useState<Omit<Product, "id">>(EMPTY_PRODUCT);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [productDeleteConfirm, setProductDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("sr_admin_auth");
    if (stored === "1") {
      setAuthed(true);
      setOrders(loadOrders());
      setDynProducts(getDynamicProducts());
    }
    const refresh = () => setDynProducts(getDynamicProducts());
    window.addEventListener("sr:products-updated", refresh);
    return () => window.removeEventListener("sr:products-updated", refresh);
  }, []);

  const handleLogin = () => {
    if (pwInput === ADMIN_PASSWORD) {
      sessionStorage.setItem("sr_admin_auth", "1");
      setAuthed(true);
      setOrders(loadOrders());
      setDynProducts(getDynamicProducts());
    } else {
      setPwError(true);
      setTimeout(() => setPwError(false), 2000);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("sr_admin_auth");
    setAuthed(false);
    setPwInput("");
  };

  const persist = useCallback((updated: Order[]) => {
    setOrders(updated);
    saveOrders(updated);
  }, []);

  const openNew = () => {
    setForm(EMPTY_ORDER);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (order: Order) => {
    const { id, ...rest } = order;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name || !form.itemTitle) return;
    if (editingId) {
      persist(orders.map((o) => (o.id === editingId ? { ...form, id: editingId } : o)));
    } else {
      persist([{ ...form, id: generateId() }, ...orders]);
    }
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    persist(orders.filter((o) => o.id !== id));
    setDeleteConfirm(null);
  };

  const filteredOrders = orders.filter((o) => {
    const matchStatus = filterStatus === "All" || o.paid === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || o.name.toLowerCase().includes(q) || o.itemTitle.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalRevenue = orders.filter((o) => o.paid === "Paid").reduce((s, o) => s + o.cost, 0);
  const pendingCount = orders.filter((o) => o.paid === "Pending").length;

  const downloadHMRCExport = async () => {
    try {
      const res = await fetch(`/api/admin-orders?key=${encodeURIComponent(ADMIN_PASSWORD)}`);
      if (!res.ok) { alert("Failed to fetch Stripe orders from Supabase."); return; }
      const { orders: stripeOrders } = await res.json();
      const headers = ["Date", "Order ID", "Item", "Brand", "Sale Price", "Postage", "Total", "Customer Name"];
      const rows = stripeOrders.map((o: Record<string, unknown>) => [
        new Date(o.date_of_sale as string).toLocaleDateString("en-GB"),
        o.id,
        `"${String(o.item_name ?? "").replace(/"/g, '""')}"`,
        `"${String(o.brand ?? "").replace(/"/g, '""')}"`,
        Number(o.price).toFixed(2),
        Number(o.postage).toFixed(2),
        Number(o.total).toFixed(2),
        `"${String(o.customer_name ?? "").replace(/"/g, '""')}"`,
      ]);
      const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stacked-racks-hmrc-${new Date().getFullYear()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not connect to Supabase. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    }
  };

  // ── Product handlers ──
  const openNewProduct = () => {
    setProductForm({ ...EMPTY_PRODUCT, listedDate: new Date().toISOString().split("T")[0] });
    setEditingProductId(null);
    setAiError("");
    setShowProductForm(true);
  };

  const openEditProduct = (p: Product) => {
    const { id, ...rest } = p;
    setProductForm(rest);
    setEditingProductId(id as number);
    setAiError("");
    setShowProductForm(true);
  };

  const handleSaveProduct = () => {
    if (!productForm.name || !productForm.brand) return;
    if (editingProductId !== null) {
      updateDynamicProduct({ ...productForm, id: editingProductId });
    } else {
      addDynamicProduct(productForm);
    }
    setShowProductForm(false);
    setEditingProductId(null);
  };

  const handleDeleteProduct = (id: number) => {
    deleteDynamicProduct(id);
    setProductDeleteConfirm(null);
  };

  const handleToggleSold = (p: Product) => {
    updateDynamicProduct({ ...p, stock: p.stock === 0 ? 1 : 0 });
  };

  const handleAiGenerate = async () => {
    if (!productForm.brand && !productForm.category) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/generate-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: productForm.brand,
          category: productForm.category,
          era: productForm.era,
          condition: productForm.condition,
          size: productForm.size,
          fit: productForm.fit,
          gender: productForm.gender,
          badge: productForm.badge,
        }),
      });
      const data = await res.json();
      if (data.title) setProductForm((prev) => ({ ...prev, name: data.title, description: data.description }));
      else setAiError(data.error ?? "AI generation failed");
    } catch {
      setAiError("Network error — check your connection");
    }
    setAiLoading(false);
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-white text-2xl font-black tracking-widest mb-1" style={{ fontFamily: "var(--font-playfair-display), serif" }}>
              STACKED RACKS
            </h1>
            <p className="text-[#444] text-xs tracking-[0.3em] uppercase">Admin Portal</p>
          </div>
          <div className="bg-[#111] border border-white/10 p-6">
            <p className="text-[#aaa] text-xs tracking-wider uppercase mb-4">Password</p>
            <input
              type="password"
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Enter admin password"
              className={`w-full bg-[#1a1a1a] border text-white text-sm px-4 py-3 outline-none focus:border-[#E8500A] transition-colors mb-4 ${
                pwError ? "border-red-500" : "border-white/10"
              }`}
            />
            {pwError && <p className="text-red-400 text-xs mb-3">Incorrect password</p>}
            <button
              onClick={handleLogin}
              className="w-full bg-[#E8500A] text-white font-black text-xs tracking-[0.2em] uppercase py-3 hover:bg-[#c94009] transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="bg-[#111] border-b border-white/10 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-white font-black tracking-widest text-sm" style={{ fontFamily: "var(--font-playfair-display), serif" }}>
              STACKED RACKS — ADMIN
            </h1>
          </div>
          {/* Tabs */}
          <div className="flex gap-1">
            {(["orders", "products"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`text-[10px] font-black tracking-[0.2em] uppercase px-4 py-1.5 border transition-all ${
                  tab === t ? "bg-[#E8500A] border-[#E8500A] text-white" : "border-white/15 text-[#555] hover:text-white hover:border-white/30"
                }`}>
                {t === "orders" ? "Orders" : "Products"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {tab === "orders" && (
            <>
              <button onClick={() => downloadCSV(orders)}
                className="flex items-center gap-2 border border-white/15 px-3 py-2 text-xs font-bold tracking-wider text-[#aaa] hover:text-white hover:border-white/30 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                </svg>
                Manual Orders
              </button>
              <button onClick={downloadHMRCExport}
                className="flex items-center gap-2 border border-[#F5C300]/30 px-3 py-2 text-xs font-bold tracking-wider text-[#F5C300]/70 hover:text-[#F5C300] hover:border-[#F5C300]/60 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                </svg>
                HMRC Export
              </button>
            </>
          )}
          <button onClick={handleLogout} className="text-[#444] hover:text-white text-xs tracking-wider transition-colors">
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ══ ORDERS TAB ══ */}
        {tab === "orders" && (<>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Orders", value: orders.length },
            { label: "Revenue (Paid)", value: `£${totalRevenue.toFixed(2)}` },
            { label: "Awaiting Payment", value: pendingCount },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#111] border border-white/8 p-4">
              <p className="text-[#444] text-[9px] tracking-[0.25em] uppercase mb-1">{label}</p>
              <p className="text-white font-black text-xl">{value}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-[#E8500A] text-white font-black text-xs tracking-[0.2em] uppercase px-4 py-2.5 hover:bg-[#c94009] transition-colors shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Order
          </button>

          <input
            type="text"
            placeholder="Search name or item…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#111] border border-white/10 text-white text-xs px-3 py-2.5 outline-none focus:border-[#E8500A]/50 transition-colors w-full sm:w-56 placeholder-[#333]"
          />

          <div className="flex gap-2">
            {(["All", "Paid", "Pending", "Refunded"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-[10px] font-bold tracking-wider px-3 py-1.5 border transition-colors ${
                  filterStatus === s
                    ? "border-[#E8500A] text-[#E8500A] bg-[#E8500A]/10"
                    : "border-white/10 text-[#555] hover:text-[#aaa] hover:border-white/20"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <span className="text-[#444] text-[10px] ml-auto">
            {filteredOrders.length} of {orders.length} orders
          </span>
        </div>

        {/* Orders table */}
        {filteredOrders.length === 0 ? (
          <div className="bg-[#111] border border-white/8 p-12 text-center">
            <p className="text-[#333] text-sm tracking-wider">
              {orders.length === 0 ? "No orders yet — add your first order above." : "No orders match your filter."}
            </p>
          </div>
        ) : (
          <div className="bg-[#111] border border-white/8 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-white/8">
                  {["Order ID", "Customer", "Item", "Cost", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="text-left text-[9px] font-black tracking-[0.2em] text-[#444] uppercase px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, i) => (
                  <tr
                    key={order.id}
                    className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}
                  >
                    <td className="px-4 py-3 text-[#E8500A] text-[10px] font-black tracking-wider whitespace-nowrap">{order.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-white text-xs font-semibold">{order.name}</p>
                      {order.phone && <p className="text-[#555] text-[10px]">{order.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-xs font-medium max-w-[180px] leading-snug">{order.itemTitle}</p>
                      {order.notes && <p className="text-[#444] text-[10px] mt-0.5 italic">{order.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-white font-black text-sm whitespace-nowrap">£{order.cost.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[9px] font-black tracking-wider px-2 py-1 ${STATUS_CLS[order.paid]}`}>{order.paid}</span>
                    </td>
                    <td className="px-4 py-3 text-[#555] text-[10px] whitespace-nowrap">{order.dateCompleted}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(order)}
                          className="text-[#444] hover:text-white text-[10px] tracking-wider transition-colors"
                        >
                          Edit
                        </button>
                        {deleteConfirm === order.id ? (
                          <span className="flex items-center gap-1">
                            <button onClick={() => handleDelete(order.id)} className="text-red-400 text-[10px] font-bold hover:text-red-300">
                              Confirm
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-[#444] text-[10px] hover:text-[#aaa]">
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(order.id)}
                            className="text-[#333] hover:text-red-400 text-[10px] tracking-wider transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Add/Edit Order Drawer */}
      {showForm && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div className="bg-[#111] border border-white/10 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl rounded-t-2xl sm:rounded-none">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#111] z-10">
              <h2 className="text-white font-black text-sm tracking-widest">{editingId ? "EDIT ORDER" : "NEW ORDER"}</h2>
              <button onClick={() => setShowForm(false)} className="text-[#aaa] hover:text-white w-8 h-8 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Customer fields */}
              <div>
                <p className="text-[#444] text-[9px] tracking-[0.25em] uppercase mb-3">Customer</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Full Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                  <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                  <Field label="Date Completed" type="date" value={form.dateCompleted} onChange={(v) => setForm({ ...form, dateCompleted: v })} />
                </div>
                <div className="mt-3">
                  <p className="text-[#555] text-[9px] tracking-wider uppercase mb-1">Shipping Address</p>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    rows={3}
                    placeholder="House, Street, City, Postcode"
                    className="w-full bg-[#1a1a1a] border border-white/10 text-white text-xs px-3 py-2 outline-none focus:border-[#E8500A]/50 transition-colors resize-none placeholder-[#333]"
                  />
                </div>
              </div>

              {/* Item fields */}
              <div>
                <p className="text-[#444] text-[9px] tracking-[0.25em] uppercase mb-3">Item</p>
                <div className="space-y-3">
                  <Field label="Item Title *" value={form.itemTitle} onChange={(v) => setForm({ ...form, itemTitle: v })} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[#555] text-[9px] tracking-wider uppercase mb-1">Cost (£) *</p>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.cost || ""}
                        onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#1a1a1a] border border-white/10 text-white text-xs px-3 py-2 outline-none focus:border-[#E8500A]/50 transition-colors"
                      />
                    </div>
                    <div>
                      <p className="text-[#555] text-[9px] tracking-wider uppercase mb-1">Payment Status</p>
                      <select
                        value={form.paid}
                        onChange={(e) => setForm({ ...form, paid: e.target.value as PaymentStatus })}
                        className="w-full bg-[#1a1a1a] border border-white/10 text-white text-xs px-3 py-2 outline-none focus:border-[#E8500A]/50 transition-colors"
                      >
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        <option value="Refunded">Refunded</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <p className="text-[#555] text-[9px] tracking-wider uppercase mb-1">Notes</p>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="e.g. Vinted sale, discount applied…"
                      className="w-full bg-[#1a1a1a] border border-white/10 text-white text-xs px-3 py-2 outline-none focus:border-[#E8500A]/50 transition-colors placeholder-[#333]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!form.name || !form.itemTitle}
                  className="flex-1 bg-[#E8500A] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs tracking-[0.2em] uppercase py-3 hover:bg-[#c94009] transition-colors"
                >
                  {editingId ? "Save Changes" : "Add Order"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-5 border border-white/10 text-[#aaa] text-xs font-bold tracking-wider hover:text-white hover:border-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>)}

        {/* ══ PRODUCTS TAB ══ */}
        {tab === "products" && (<>

          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-white font-black text-sm tracking-wider">Your Products</p>
              <p className="text-[#444] text-[10px] mt-0.5">{dynProducts.length} item{dynProducts.length !== 1 ? "s" : ""} added via admin</p>
            </div>
            <button onClick={openNewProduct}
              className="flex items-center gap-2 bg-[#E8500A] text-white font-black text-xs tracking-[0.2em] uppercase px-4 py-2.5 hover:bg-[#c94009] transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </button>
          </div>

          {dynProducts.length === 0 ? (
            <div className="bg-[#111] border border-white/8 p-12 text-center">
              <p className="text-[#333] text-sm">No products added yet — click Add Product to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dynProducts.map((p) => (
                <div key={p.id} className="bg-[#111] border border-white/8 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 ${p.stock === 0 ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"}`}>
                      {p.stock === 0 ? "SOLD" : "IN STOCK"}
                    </span>
                    <span className="text-[#E8500A] font-black text-sm">£{p.price}</span>
                  </div>
                  <p className="text-white text-xs font-bold leading-snug mb-1 line-clamp-2">{p.name}</p>
                  <p className="text-[#555] text-[10px] mb-1">{p.brand} · {p.category} · Size {p.size}</p>
                  <p className="text-[#444] text-[10px] mb-3">{p.era} · {p.condition} · {p.gender}</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleToggleSold(p)}
                      className={`flex-1 text-[9px] font-black tracking-wider uppercase py-1.5 border transition-colors ${p.stock === 0 ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" : "border-red-500/40 text-red-400 hover:bg-red-500/10"}`}>
                      {p.stock === 0 ? "Mark In Stock" : "Mark Sold"}
                    </button>
                    <button onClick={() => openEditProduct(p)}
                      className="px-3 text-[9px] font-bold tracking-wider uppercase border border-white/15 text-[#aaa] hover:text-white transition-colors">
                      Edit
                    </button>
                    {productDeleteConfirm === p.id ? (
                      <span className="flex gap-1">
                        <button onClick={() => handleDeleteProduct(p.id as number)} className="text-red-400 text-[9px] font-bold px-2 hover:text-red-300">Del</button>
                        <button onClick={() => setProductDeleteConfirm(null)} className="text-[#444] text-[9px] px-1">✕</button>
                      </span>
                    ) : (
                      <button onClick={() => setProductDeleteConfirm(p.id as number)}
                        className="px-2 text-[#333] hover:text-red-400 text-[9px] transition-colors">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Add/Edit Product Form ── */}
          {showProductForm && (
            <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-8 bg-black/80 backdrop-blur-sm overflow-y-auto"
              onClick={(e) => e.target === e.currentTarget && setShowProductForm(false)}>
              <div className="bg-[#111] border border-white/10 w-full max-w-2xl shadow-2xl mb-8">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#111] z-10">
                  <h2 className="text-white font-black text-sm tracking-widest">{editingProductId ? "EDIT PRODUCT" : "NEW PRODUCT"}</h2>
                  <button onClick={() => setShowProductForm(false)} className="text-[#aaa] hover:text-white w-8 h-8 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-5 space-y-5">

                  {/* Brand + Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[#555] text-[9px] tracking-[0.2em] uppercase mb-2">Brand *</p>
                      <input
                        list="brand-suggestions"
                        value={productForm.brand}
                        onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                        placeholder="e.g. Nike, Adidas, Burberry"
                        className="w-full bg-[#1a1a1a] border border-white/10 text-white text-xs px-3 py-2.5 outline-none focus:border-[#E8500A]/50 placeholder-[#333]"
                      />
                      <datalist id="brand-suggestions">
                        {Array.from(new Set([
                          ...getBrandsInStock([...dynProducts, ...staticProducts]),
                          ...ALL_BRANDS,
                        ])).sort().map((b) => <option key={b} value={b} />)}
                      </datalist>
                    </div>
                    <div>
                      <p className="text-[#555] text-[9px] tracking-[0.2em] uppercase mb-2">Price (£) *</p>
                      <input type="number" min="0" step="0.01" value={productForm.price || ""}
                        onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-[#1a1a1a] border border-white/10 text-white text-xs px-3 py-2.5 outline-none focus:border-[#E8500A]/50" />
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <p className="text-[#555] text-[9px] tracking-[0.2em] uppercase mb-2">Gender</p>
                    <div className="flex gap-2">
                      {(["Mens", "Womens"] as const).map((g) => (
                        <Chip key={g} label={g} active={productForm.gender === g} onClick={() => setProductForm({ ...productForm, gender: g })} />
                      ))}
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <p className="text-[#555] text-[9px] tracking-[0.2em] uppercase mb-2">Category</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map((c) => (
                        <Chip key={c} label={c} active={productForm.category === c} onClick={() => setProductForm({ ...productForm, category: c })} />
                      ))}
                    </div>
                  </div>

                  {/* Size + Era */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[#555] text-[9px] tracking-[0.2em] uppercase mb-2">Size</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SIZES.map((s) => (
                          <Chip key={s} label={s} active={productForm.size === s} onClick={() => setProductForm({ ...productForm, size: s })} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[#555] text-[9px] tracking-[0.2em] uppercase mb-2">Era</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ERAS.map((e) => (
                          <Chip key={e} label={e} active={productForm.era === e as Era} onClick={() => setProductForm({ ...productForm, era: e as Era })} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Condition + Fit */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[#555] text-[9px] tracking-[0.2em] uppercase mb-2">Condition</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(["Excellent", "Good", "Fair"] as const).map((c) => (
                          <Chip key={c} label={c} active={productForm.condition === c} onClick={() => setProductForm({ ...productForm, condition: c as Condition })} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[#555] text-[9px] tracking-[0.2em] uppercase mb-2">Fit</p>
                      <div className="flex flex-wrap gap-1.5">
                        {FITS.map((f) => (
                          <Chip key={f} label={f} active={productForm.fit === f as Fit} onClick={() => setProductForm({ ...productForm, fit: f as Fit })} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Badge */}
                  <div>
                    <p className="text-[#555] text-[9px] tracking-[0.2em] uppercase mb-2">Badge</p>
                    <div className="flex flex-wrap gap-2">
                      {(["NEW", "RARE"] as const).map((b) => (
                        <Chip key={b} label={b} active={productForm.badge === b} onClick={() => setProductForm({ ...productForm, badge: b })} />
                      ))}
                      {productForm.badge === "RARE" && (
                        <div className="flex flex-wrap gap-1.5 mt-1 w-full">
                          {(["ARCHIVE", "GRAIL", "ERA PIECE"] as const).map((rb) => (
                            <Chip key={rb} label={rb}
                              active={productForm.rareBadge === rb}
                              onClick={() => setProductForm({ ...productForm, rareBadge: productForm.rareBadge === rb ? undefined : rb as RareBadge })} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Generate */}
                  <div className="border-t border-white/8 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#555] text-[9px] tracking-[0.2em] uppercase">Title & Description</p>
                      <button onClick={handleAiGenerate} disabled={aiLoading || !productForm.brand}
                        className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#E8500A]/40 text-[#E8500A] text-[9px] font-black tracking-[0.15em] uppercase px-3 py-1.5 hover:bg-[#E8500A]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        {aiLoading ? (
                          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity={0.25} />
                            <path d="M3.75 12a8.25 8.25 0 018.25-8.25" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          </svg>
                        )}
                        {aiLoading ? "Generating…" : "AI Generate"}
                      </button>
                    </div>
                    {aiError && <p className="text-red-400 text-[10px] mb-2">{aiError}</p>}
                    <input value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="Product title"
                      className="w-full bg-[#1a1a1a] border border-white/10 text-white text-xs px-3 py-2.5 outline-none focus:border-[#E8500A]/50 placeholder-[#333] mb-2" />
                    <textarea value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      rows={3} placeholder="Product description"
                      className="w-full bg-[#1a1a1a] border border-white/10 text-white text-xs px-3 py-2.5 outline-none focus:border-[#E8500A]/50 placeholder-[#333] resize-none" />
                    <p className="text-[#333] text-[9px] mt-1">Fill in Brand, Category, Era and Condition first for best AI results</p>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button onClick={handleSaveProduct} disabled={!productForm.name || !productForm.brand || productForm.price <= 0}
                      className="flex-1 bg-[#E8500A] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs tracking-[0.2em] uppercase py-3 hover:bg-[#c94009] transition-colors">
                      {editingProductId ? "Save Changes" : "Add to Shop"}
                    </button>
                    <button onClick={() => setShowProductForm(false)}
                      className="px-5 border border-white/10 text-[#aaa] text-xs font-bold hover:text-white hover:border-white/20 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </>)}

      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <p className="text-[#555] text-[9px] tracking-wider uppercase mb-1">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#1a1a1a] border border-white/10 text-white text-xs px-3 py-2 outline-none focus:border-[#E8500A]/50 transition-colors"
      />
    </div>
  );
}

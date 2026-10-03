# Sold → To Be Confirmed → Sold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zakery can mark an item sold from its listing page (the SOLD sign shows at once), then confirm it once posted and delivered. Only confirmed sales reach the HMRC CSV and the new "Copy for Google Sheets" button.

**Architecture:** There is no schema change. A sale's stage comes from the existing `orders.payment_status` and `fulfilment_status`. Shared logic lives in a new pure module, `lib/sales.ts`, used by the admin page and the new owner panel. Two existing admin API routes get small additive fields. The product page renders an owner-only client panel when `isAdminRequest()` is true.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase. Tests use `node --test --experimental-strip-types`.

**Spec:** `docs/superpowers/specs/2026-10-03-sold-confirmation-design.md`

## Global Constraints

- No change to the Stripe, checkout or webhook code, or to `supabase/schema.sql`.
- Stage rules:
  - `to_confirm` is paid with fulfilment paid, packing or dispatched (missing counts as paid).
  - `sold` is paid with fulfilment delivered.
  - Anything else is `other`.
- HMRC columns, in order: Date, Order ID, Item, Brand, Sales Channel, Sale Price, Item Purchase Cost, Gross Profit Before Fees, Postage, Total, Customer Name.
- The owner panel is rendered only when `isAdminRequest()` is true on the server.
- Every admin write keeps the `isAdminRequest()` and `sameOrigin()` checks.
- Brand colours: `#0A0A0A`, `#E8500A`, `#F5C300`.
- `npm test` and `npm run build` must pass before the push.

## Review Focus

- A negative gross profit (cost above price) must stay a number in the CSV and TSV, not be turned into text by the formula guard. Test in Task 1.
- Item names with tabs, newlines or a leading `=` must not break or inject into Google Sheets. Test in Task 1.
- Editing cost on a multi-item website order must be refused, not silently overwrite one item. Guarded in Task 2.
- Marking an item sold twice (double click, or already sold on Vinted) must return 409, with no second order. The buttons are disabled while a request runs (Tasks 2 and 4).
- The owner panel must not appear for a signed-out visitor. Checked manually in Task 5.

---

### Task 1: `lib/sales.ts` (stage, cost, account rows, CSV/TSV)

**Files:**
- Create: `lib/sales.ts`
- Test: `tests/sales.test.ts`

**Interfaces:**
- Produces:
  - `type SaleStage = "to_confirm" | "sold" | "other"`
  - `saleStage(order: { payment_status: string; fulfilment_status?: string }): SaleStage`
  - `orderPurchaseCost(order: SaleOrder, products: CostProduct[]): number`
  - `salesChannel(source: string): string`
  - `ACCOUNT_HEADERS: string[]`
  - `accountRows(orders: SaleOrder[], products: CostProduct[], from?: string, to?: string): string[][]`
  - `toCsv(rows: string[][]): string` (header row included)
  - `toTsv(rows: string[][]): string` (no header row)

- [ ] **Step 1: Write the failing tests** in `tests/sales.test.ts`

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { accountRows, orderPurchaseCost, saleStage, toCsv, toTsv, type SaleOrder } from "../lib/sales.ts";

const base: SaleOrder = { id: "VINTED-1", item_id: "p1", source: "vinted", item_name: "Carhartt Jacket", brand: "Carhartt", price: 27, postage: 0, total: 27, customer_name: "Vinted buyer", payment_status: "paid", fulfilment_status: "paid", date_of_sale: "2026-10-03T10:00:00Z", items: [{ id: "p1", costPrice: 15 }] };

test("saleStage splits to-confirm, sold and other", () => {
  assert.equal(saleStage({ payment_status: "paid" }), "to_confirm");
  assert.equal(saleStage({ payment_status: "paid", fulfilment_status: "packing" }), "to_confirm");
  assert.equal(saleStage({ payment_status: "paid", fulfilment_status: "dispatched" }), "to_confirm");
  assert.equal(saleStage({ payment_status: "paid", fulfilment_status: "delivered" }), "sold");
  assert.equal(saleStage({ payment_status: "paid", fulfilment_status: "returned" }), "other");
  assert.equal(saleStage({ payment_status: "refunded", fulfilment_status: "refunded" }), "other");
});

test("account rows include confirmed sales only, within the date range", () => {
  const sold = { ...base, id: "A", fulfilment_status: "delivered" };
  const old = { ...sold, id: "B", date_of_sale: "2026-09-01T10:00:00Z" };
  const rows = accountRows([base, sold, old, { ...sold, id: "C", payment_status: "refunded" }], [], "2026-10-01", "2026-10-31");
  assert.deepEqual(rows.map((row) => row[1]), ["A"]);
  assert.deepEqual(rows[0].slice(4, 8), ["Vinted", "27.00", "15.00", "12.00"]);
});

test("purchase cost prefers snapshot, then product id, then product name", () => {
  const products = [{ id: "p1", name: "Carhartt Jacket", costPrice: 20 }];
  assert.equal(orderPurchaseCost(base, products), 15);
  assert.equal(orderPurchaseCost({ ...base, items: [] }, products), 20);
  assert.equal(orderPurchaseCost({ ...base, items: [], item_id: "" }, products), 20);
});

test("negative profit stays numeric in CSV and TSV", () => {
  const rows = accountRows([{ ...base, fulfilment_status: "delivered", price: 10, total: 10 }], []);
  assert.equal(rows[0][7], "-5.00");
  assert.match(toCsv(rows), /,-5\.00,/);
  assert.match(toTsv(rows), /\t-5\.00\t/);
});

test("TSV flattens tabs/newlines and guards formulas", () => {
  const rows = accountRows([{ ...base, fulfilment_status: "delivered", item_name: "=HYPERLINK(1)\tbad\nname" }], []);
  const cells = toTsv(rows).split("\t");
  assert.equal(toTsv(rows).split("\n").length, 1);
  assert.equal(cells[2], "'=HYPERLINK(1) bad name");
});
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `npm test`
Expected: FAIL, with `Cannot find module '../lib/sales.ts'`.

- [ ] **Step 3: Implement `lib/sales.ts`**

```ts
export type SaleStage = "to_confirm" | "sold" | "other";

export interface SaleOrder {
  id: string;
  item_id?: string;
  source: string;
  item_name: string;
  brand: string;
  price: number | string;
  postage: number | string;
  total: number | string;
  customer_name: string;
  payment_status: string;
  fulfilment_status?: string;
  date_of_sale: string;
  items?: Array<{ id?: string; name?: string; brand?: string; price?: number | string; costPrice?: number | string }>;
}

export interface CostProduct {
  id: string | number;
  name: string;
  costPrice?: number;
}

export const ACCOUNT_HEADERS = ["Date", "Order ID", "Item", "Brand", "Sales Channel", "Sale Price", "Item Purchase Cost", "Gross Profit Before Fees", "Postage", "Total", "Customer Name"];

export function saleStage(order: { payment_status: string; fulfilment_status?: string }): SaleStage {
  if (order.payment_status !== "paid") return "other";
  const fulfilment = order.fulfilment_status ?? "paid";
  if (fulfilment === "delivered") return "sold";
  return ["paid", "packing", "dispatched"].includes(fulfilment) ? "to_confirm" : "other";
}

export function orderPurchaseCost(order: SaleOrder, products: CostProduct[]) {
  const itemSnapshots = Array.isArray(order.items) ? order.items : [];
  if (itemSnapshots.some((item) => item.costPrice !== undefined)) {
    return itemSnapshots.reduce((sum, item) => sum + Number(item.costPrice || 0), 0);
  }
  const productIds = String(order.item_id ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  const productsById = products.filter((product) => productIds.includes(String(product.id)));
  if (productsById.length) return productsById.reduce((sum, product) => sum + Number(product.costPrice || 0), 0);
  const itemNames = String(order.item_name ?? "").split(" | ").map((name) => name.trim().toLowerCase());
  return products
    .filter((product) => itemNames.includes(product.name.trim().toLowerCase()))
    .reduce((sum, product) => sum + Number(product.costPrice || 0), 0);
}

export function salesChannel(source: string) {
  const normalisedSource = String(source ?? "").trim().toLowerCase();
  if (normalisedSource === "vinted") return "Vinted";
  if (normalisedSource === "stripe" || normalisedSource === "website") return "Stacked Racks Website";
  if (normalisedSource === "manual") return "Manual sale";
  return source || "Unknown";
}

function inRange(dateOfSale: string, from = "", to = "") {
  const time = new Date(dateOfSale).getTime();
  return (!from || time >= new Date(`${from}T00:00:00`).getTime()) && (!to || time <= new Date(`${to}T23:59:59`).getTime());
}

export function accountRows(orders: SaleOrder[], products: CostProduct[], from = "", to = "") {
  return orders
    .filter((order) => saleStage(order) === "sold" && inRange(order.date_of_sale, from, to))
    .map((order) => {
      const price = Number(order.price);
      const cost = orderPurchaseCost(order, products);
      return [
        new Date(order.date_of_sale).toLocaleDateString("en-GB"),
        order.id,
        order.item_name,
        order.brand,
        salesChannel(order.source),
        price.toFixed(2),
        cost.toFixed(2),
        (price - cost).toFixed(2),
        Number(order.postage).toFixed(2),
        Number(order.total).toFixed(2),
        order.customer_name,
      ];
    });
}

const isNumber = (text: string) => /^-?\d+(\.\d+)?$/.test(text);
// Spreadsheet formula guard: text starting with = + - @ is prefixed with ' so Excel/Sheets keep it as text.
const guard = (text: string) => (/^[=+\-@]/.test(text) ? `'${text}` : text);

export function toCsv(rows: string[][]) {
  const cell = (value: string) => (isNumber(value) ? value : `"${guard(value).replaceAll('"', '""')}"`);
  return `﻿${[ACCOUNT_HEADERS, ...rows].map((row) => row.map(cell).join(",")).join("\n")}`;
}

export function toTsv(rows: string[][]) {
  const cell = (value: string) => (isNumber(value) ? value : guard(value.replace(/[\t\r\n]+/g, " ").trim()));
  return rows.map((row) => row.map(cell).join("\t")).join("\n");
}
```

- [ ] **Step 4: Run the tests and check they pass**

Run: `npm test`
Expected: PASS (all old and new tests).

- [ ] **Step 5: Commit**

```bash
git add lib/sales.ts tests/sales.test.ts
git commit -m "Add sale stage and account row helpers"
```

### Task 2: API: sale channel and order price edits

**Files:**
- Modify: `app/api/admin-vinted-sale/route.ts`
- Modify: `app/api/admin-orders/route.ts`, the PATCH handler

**Interfaces:**
- Produces:
  - `POST /api/admin-vinted-sale` accepts an optional `channel: "vinted" | "other"`. "other" makes `source: "manual"`, id `SR-…`, `customer_name: "Direct buyer"`. A 409 comes back if any vinted or manual order exists for the item.
  - `PATCH /api/admin-orders` accepts an optional `price` and `cost_price` (finite numbers ≥ 0).
    - `price` sets `price`, `total = price + postage`, and `items[0].price`.
    - `cost_price` sets `items[0].costPrice`.
    - A 400 comes back on invalid numbers, or on a cost edit for a multi-item order.

- [ ] **Step 1: Sale route.**
  - Add `channel?: string` to the body type and `const channel = body.channel === "other" ? "other" : "vinted";`.
  - Change the duplicate check to `.in("source", ["vinted", "manual"])` with the message `"This item is already recorded as sold"`.
  - In the order row:
    - `id: channel === "vinted" ? \`VINTED-${stamp}\` : \`SR-${stamp}\`` (where `const stamp = Date.now().toString(36).toUpperCase();`)
    - `source: channel === "vinted" ? "vinted" : "manual"`
    - `customer_name: channel === "vinted" ? "Vinted buyer" : "Direct buyer"`
    - `notes: channel === "vinted" ? "Sold on Vinted" : "Sold directly"`
  - Audit action: `channel === "vinted" ? "product.sold_on_vinted" : "product.sold_directly"`.

- [ ] **Step 2: Order PATCH.**
  - Widen the body type with `price?: number; cost_price?: number`, and change `changes` to `Record<string, unknown>`.
  - Move `const supabase = getSupabaseAdmin();` above the price block, then insert before the update:

```ts
  const price = body.price === undefined ? undefined : Number(body.price);
  const costPrice = body.cost_price === undefined ? undefined : Number(body.cost_price);
  if ([price, costPrice].some((value) => value !== undefined && (!Number.isFinite(value) || value < 0))) {
    return NextResponse.json({ error: "Prices must be numbers of 0 or more" }, { status: 400 });
  }
  if (price !== undefined || costPrice !== undefined) {
    const { data: current, error: currentError } = await supabase.from("orders").select("postage, items").eq("id", body.id).single();
    if (currentError || !current) return NextResponse.json({ error: currentError?.message ?? "Order not found" }, { status: 404 });
    const items = Array.isArray(current.items) && current.items.length ? current.items : [{}];
    if (items.length > 1) return NextResponse.json({ error: "Prices can only be edited on single-item orders" }, { status: 400 });
    const item = { ...items[0] };
    if (price !== undefined) {
      changes.price = price;
      changes.total = price + Number(current.postage || 0);
      item.price = price;
    }
    if (costPrice !== undefined) item.costPrice = costPrice;
    changes.items = [item];
  }
```

- [ ] **Step 3:** Run `npm run build`. Expected: compiles with no type errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin-vinted-sale/route.ts app/api/admin-orders/route.ts
git commit -m "Allow direct-sale channel and order price edits in admin APIs"
```

### Task 3: Admin Sales tab: stage filter, confirm buttons, price edits, Google Sheets copy

**Files:**
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `saleStage`, `orderPurchaseCost`, `accountRows`, `toCsv` and `toTsv` from `@/lib/sales`. The PATCH `price`/`cost_price` from Task 2.

- [ ] **Step 1: Swap the local helpers for the shared module.**
  - Delete `csvCell`, `orderPurchaseCost`, `salesChannel` and `downloadHmrcCsv` from `app/admin/page.tsx`. Import from `@/lib/sales` instead.
  - Add a small downloader:

```ts
function downloadCsv(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `stacked-racks-hmrc-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: State and derived values.**
  - Add `const [stageFilter, setStageFilter] = useState<"to_confirm" | "sold" | "all">("to_confirm");`, `const [copyNote, setCopyNote] = useState("");` and `const [copyFallback, setCopyFallback] = useState("");`.
  - Replace `exportableOrders` with `const accountRowList = accountRows(orders, products, exportFrom, exportTo);`.
  - In `filteredOrders`, filter by `stageFilter === "all" || saleStage(order) === stageFilter` before the search (and add `stageFilter` to the deps).
  - Counts: `const toConfirmCount = orders.filter((order) => saleStage(order) === "to_confirm").length;` and `soldCount` the same way.

- [ ] **Step 3: Handlers.**

```ts
  const saveOrderPrices = async (order: OrderRow, changes: { price?: number; cost_price?: number }) => {
    const response = await fetch("/api/admin-orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order.id, ...changes }) });
    const data = await response.json();
    if (!response.ok) return setDataError(data.error ?? "Could not update prices");
    await loadDashboard();
  };

  const copyForSheets = async () => {
    const text = toTsv(accountRowList);
    try {
      await navigator.clipboard.writeText(text);
      setCopyFallback("");
      setCopyNote(`Copied ${accountRowList.length} rows. Paste under the last row of your Google Sheet.`);
    } catch {
      setCopyFallback(text);
      setCopyNote("Copy blocked by the browser: select the text below and copy it.");
    }
  };
```

- [ ] **Step 4: Toolbar markup.**
  - Before the search input, add the stage pills:

```tsx
<div className="flex gap-2">{([["to_confirm", `To be confirmed (${toConfirmCount})`], ["sold", `Sold (${soldCount})`], ["all", "All"]] as const).map(([value, label]) => <button key={value} onClick={() => setStageFilter(value)} className={`px-3 py-2.5 text-[10px] font-black tracking-wider uppercase border ${stageFilter === value ? "bg-[#F5C300] text-[#0a0a0a] border-[#F5C300]" : "border-white/10 text-[#aaa]"}`}>{label}</button>)}</div>
```

  - Replace the export button with:

```tsx
<button onClick={() => downloadCsv(toCsv(accountRowList))} className="border border-[#F5C300]/40 text-[#F5C300] px-4 py-2.5 text-[10px] font-black tracking-wider uppercase">Export {accountRowList.length} confirmed to HMRC CSV</button>
<button onClick={() => void copyForSheets()} className="border border-[#F5C300]/40 text-[#F5C300] px-4 py-2.5 text-[10px] font-black tracking-wider uppercase">Copy {accountRowList.length} for Google Sheets</button>
```

  - Under the toolbar: `{copyNote && <p className="text-[#F5C300] text-[10px] mb-2">{copyNote}</p>}{copyFallback && <textarea readOnly value={copyFallback} onFocus={(event) => event.target.select()} autoFocus className="w-full h-32 mb-4 bg-[#171717] border border-white/10 p-2 text-xs text-white" />}`
  - Update the help text to: "HMRC CSV and Google Sheets copy include confirmed sales only (marked delivered), with what you paid and gross profit before fees."

- [ ] **Step 5: Row actions.** In each order row, `const toConfirm = saleStage(order) === "to_confirm";`.
  - **Fulfilment cell:** after the select, add `{toConfirm && <div className="flex gap-1 mt-1">{order.fulfilment_status !== "dispatched" && <button onClick={() => void updateOrder(order, "dispatched")} className="border border-white/15 px-2 py-1 text-[9px] uppercase">Posted</button>}<button onClick={() => void updateOrder(order, "delivered")} className="bg-[#F5C300] text-[#0a0a0a] px-2 py-1 text-[9px] font-black uppercase">Confirm sold</button></div>}`.
  - **Item cost cell:** when `toConfirm`, render `<input aria-label={\`Bought price for ${order.id}\`} key={\`${order.id}-cost-${purchaseCost}\`} type="number" min="0" step="0.01" defaultValue={purchaseCost} onBlur={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0 && value !== purchaseCost) void saveOrderPrices(order, { cost_price: value }); }} className="w-20 bg-[#171717] border border-white/10 px-2 py-1 text-white text-xs" />`. Otherwise keep `money(purchaseCost)`.
  - **Total cell:** when `toConfirm`, render the same input for the sold price: key `${order.id}-price-${order.price}`, `defaultValue={Number(order.price)}`, saving `{ price: value }` when it changes. Otherwise keep `money(order.total)`.

- [ ] **Step 6:** Run `npm test && npm run build`. Expected: PASS and compiled.

- [ ] **Step 7: Commit**

```bash
git add app/admin/page.tsx
git commit -m "Split admin sales into to-be-confirmed and sold, add Google Sheets copy"
```

### Task 4: Owner panel on the listing page

**Files:**
- Create: `components/OwnerSalePanel.tsx`
- Modify: `app/products/[id]/[slug]/page.tsx`

**Interfaces:**
- Consumes: `saleStage` from `@/lib/sales`, `POST /api/admin-vinted-sale` with `channel`, `GET` and `PATCH /api/admin-orders`.
- Produces: `<OwnerSalePanel productId price costPrice sold />`.

- [ ] **Step 1: Create `components/OwnerSalePanel.tsx`.**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saleStage } from "@/lib/sales";

type PanelOrder = { id: string; item_id?: string; source: string; payment_status: string; fulfilment_status?: string; price: number | string; date_of_sale: string };

const INPUT = "w-full bg-[#171717] border border-white/15 px-3 py-2 text-white text-sm";
const STAGE_LABEL = { to_confirm: "Sold – to be confirmed", sold: "Sold – confirmed", other: "Refunded / returned" } as const;

export default function OwnerSalePanel({ productId, price, costPrice, sold }: { productId: string; price: number; costPrice?: number; sold: boolean }) {
  const router = useRouter();
  const [bought, setBought] = useState(costPrice ? String(costPrice) : "");
  const [soldPrice, setSoldPrice] = useState(String(price));
  const [channel, setChannel] = useState<"vinted" | "other">("vinted");
  const [order, setOrder] = useState<PanelOrder | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sold) return;
    fetch("/api/admin-orders").then((response) => response.json()).then((data) => {
      const match = ((data.orders ?? []) as PanelOrder[]).find((row) => String(row.item_id ?? "").split(",").map((id) => id.trim()).includes(productId));
      setOrder(match ?? null);
      setLoaded(true);
    }).catch(() => setError("Could not load the sale"));
  }, [sold, productId]);

  const send = async (url: string, method: string, body: object) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (response.status === 401) throw new Error("Signed out: sign in to /admin again");
      if (!response.ok) throw new Error(data.error ?? "Something went wrong");
      return data;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const markSold = async () => {
    const data = await send("/api/admin-vinted-sale", "POST", { productId, purchasePrice: Number(bought), soldPrice: Number(soldPrice), channel });
    if (data) router.refresh();
  };

  const setStatus = async (fulfilment_status: "dispatched" | "delivered") => {
    if (!order) return;
    const data = await send("/api/admin-orders", "PATCH", { id: order.id, fulfilment_status });
    if (data?.order) setOrder(data.order);
  };

  return <div className="mt-5 border border-[#F5C300]/50 bg-[#F5C300]/5 p-4">
    <p className="text-[#F5C300] text-[10px] font-black uppercase tracking-[0.2em] mb-3">Owner only</p>
    {!sold && <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[#aaa] text-xs">Bought £<input type="number" min="0" step="0.01" value={bought} onChange={(event) => setBought(event.target.value)} className={INPUT} /></label>
        <label className="text-[#aaa] text-xs">Sold £<input type="number" min="0" step="0.01" value={soldPrice} onChange={(event) => setSoldPrice(event.target.value)} className={INPUT} /></label>
      </div>
      <label className="text-[#aaa] text-xs">Sold on<select value={channel} onChange={(event) => setChannel(event.target.value as "vinted" | "other")} className={INPUT}><option value="vinted">Vinted</option><option value="other">Other (in person, Depop…)</option></select></label>
      <button disabled={busy || bought === "" || !(Number(soldPrice) > 0)} onClick={() => void markSold()} className="min-h-11 bg-[#F5C300] text-[#0a0a0a] font-black text-xs uppercase tracking-wider disabled:opacity-40">Sold – to be confirmed</button>
    </div>}
    {sold && !order && !error && <p className="text-[#aaa] text-sm">{loaded ? "Sold, but no sale record found. Record it in /admin." : "Sold. Loading sale…"}</p>}
    {sold && order && <div className="grid gap-2">
      <p className="text-white text-sm font-bold">{STAGE_LABEL[saleStage(order)]} · {order.id} · £{Number(order.price).toFixed(2)}</p>
      {saleStage(order) === "to_confirm" && <div className="flex gap-2">
        {order.fulfilment_status !== "dispatched" && <button disabled={busy} onClick={() => void setStatus("dispatched")} className="min-h-11 flex-1 border border-white/20 text-white text-xs font-bold uppercase disabled:opacity-40">Posted</button>}
        <button disabled={busy} onClick={() => void setStatus("delivered")} className="min-h-11 flex-1 bg-[#F5C300] text-[#0a0a0a] text-xs font-black uppercase disabled:opacity-40">Confirm sold</button>
      </div>}
    </div>}
    {error && <p className="mt-2 text-[#ff8a5c] text-xs">{error}</p>}
  </div>;
}
```

- [ ] **Step 2: Product page.**
  - Add `import OwnerSalePanel from "@/components/OwnerSalePanel";` and `import { isAdminRequest } from "@/lib/server/admin-auth";`.
  - In the page component, after the product is loaded: `const isOwner = await isAdminRequest().catch(() => false);`.
  - After the buy/sold block, render `{isOwner && <OwnerSalePanel productId={String(product.id)} price={product.price} costPrice={product.costPrice} sold={product.stock <= 0} />}`.

- [ ] **Step 3:** Run `npm test && npm run build`. Expected: PASS and compiled.

- [ ] **Step 4: Commit**

```bash
git add components/OwnerSalePanel.tsx "app/products/[id]/[slug]/page.tsx"
git commit -m "Add owner-only sale panel to product pages"
```

### Task 5: Review, ship, master sheet

- [ ] **Step 1:** Run one fresh reviewer over the whole branch diff (`git diff origin/main...HEAD`), focusing on the Review Focus list. Fix any real findings.
- [ ] **Step 2: Push and open the pull request.**
  - `git push -u origin feature/sold-confirmation`, then open a pull request with `gh pr create` (body ends with the attribution line).
  - Wait for the Vercel preview. Check `/products/<an unsold id>/…` in a signed-out tab and confirm no "Owner only" text.
- [ ] **Step 3: Merge.** Zakery gave consent on 3 Oct: `gh pr merge --squash`. Then check the live site: `/shop` loads, and a product page with no admin cookie shows no panel.
- [ ] **Step 4: Master sheet.** In Google Drive, create "HMRC sales – Stacked Racks" with `ACCOUNT_HEADERS` as row 1 and the 4 delivered sales as rows (taken from the admin export).

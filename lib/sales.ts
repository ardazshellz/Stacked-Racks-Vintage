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
  items?: Array<{ id?: string; name?: string; brand?: string; price?: number | string; costPrice?: number | string; boughtFrom?: string; costTaxYear?: string }>;
}

export interface CostProduct {
  id: string | number;
  name: string;
  costPrice?: number;
  source?: string;
  costTaxYear?: string;
}

export const ACCOUNT_HEADERS = ["Date", "Order ID", "Item", "Brand", "Sales Channel", "Sale Price", "Item Purchase Cost", "Gross Profit Before Fees", "Postage", "Total", "Customer Name", "Bought From", "Cost Tax Year", "Sale Tax Year", "Tax Estimate (20%)"];

// A paid sale is "to confirm" until it is marked delivered; only then does it count in the accounts.
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

// UK tax year runs 6 April to 5 April: 3 Oct 2026 is in "2026-27", 5 Apr 2026 in "2025-26".
export function taxYear(date: string) {
  let text = String(date ?? "");
  if (/T\d{2}:\d{2}/.test(text)) {
    // Timestamps are read in UK time, so 00:30 BST on 6 April counts as the new tax year.
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return "";
    text = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed);
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (!match) return "";
  const [year, month, day] = match.slice(1).map(Number);
  const start = month > 4 || (month === 4 && day >= 6) ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export function isTaxYear(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value ?? ""));
  return Boolean(match) && (Number(match![1]) + 1) % 100 === Number(match![2]);
}

function productsFor(order: SaleOrder, products: CostProduct[]) {
  const productIds = String(order.item_id ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  return products.filter((product) => productIds.includes(String(product.id)));
}

export function orderBoughtFrom(order: SaleOrder, products: CostProduct[]) {
  return order.items?.find((item) => item.boughtFrom)?.boughtFrom ?? productsFor(order, products).find((product) => product.source)?.source ?? "";
}

export function orderCostTaxYear(order: SaleOrder, products: CostProduct[]) {
  return order.items?.find((item) => item.costTaxYear)?.costTaxYear ?? productsFor(order, products).find((product) => product.costTaxYear)?.costTaxYear ?? "";
}

const round2 = (value: number) => Math.round(value * 100) / 100;

// Zakery's 20% estimate: a cost bought in an earlier tax year belongs to that year's return, so the whole sale price is taxed.
export function taxEstimate(price: number, cost: number, saleYear: string, costYear: string) {
  return round2(0.2 * (costYear && costYear < saleYear ? price : price - cost));
}

interface SaleLine { price: number; cost: number; costYear: string }

// Single-item orders use the order's figures; baskets are split per item so each keeps its own cost year.
function orderLines(order: SaleOrder, products: CostProduct[]): SaleLine[] {
  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length <= 1) return [{ price: Number(order.price), cost: orderPurchaseCost(order, products), costYear: orderCostTaxYear(order, products) }];
  return items.map((item) => {
    const product = products.find((candidate) => String(candidate.id) === String(item.id));
    return { price: Number(item.price ?? 0), cost: Number(item.costPrice ?? product?.costPrice ?? 0), costYear: item.costTaxYear || product?.costTaxYear || "" };
  });
}

export function orderTax(order: SaleOrder, products: CostProduct[]) {
  const saleYear = taxYear(order.date_of_sale);
  return round2(orderLines(order, products).reduce((sum, line) => sum + taxEstimate(line.price, line.cost, saleYear, line.costYear), 0));
}

function orderCostYearLabel(order: SaleOrder, products: CostProduct[]) {
  const years = [...new Set(orderLines(order, products).map((line) => line.costYear))];
  return years.length > 1 ? "mixed" : years[0];
}

export function taxSummary(orders: SaleOrder[], products: CostProduct[]) {
  const years = new Map<string, { year: string; sales: number; revenue: number; costsDeducted: number; tax: number; costsToClaim: number }>();
  const row = (year: string) => years.get(year) ?? years.set(year, { year, sales: 0, revenue: 0, costsDeducted: 0, tax: 0, costsToClaim: 0 }).get(year)!;
  for (const order of orders.filter((candidate) => saleStage(candidate) === "sold")) {
    const saleYear = taxYear(order.date_of_sale);
    const sale = row(saleYear);
    sale.sales += 1;
    sale.revenue = round2(sale.revenue + Number(order.price));
    sale.tax = round2(sale.tax + orderTax(order, products));
    for (const line of orderLines(order, products)) {
      if (line.costYear && line.costYear < saleYear) row(line.costYear).costsToClaim = round2(row(line.costYear).costsToClaim + line.cost);
      else sale.costsDeducted = round2(sale.costsDeducted + line.cost);
    }
  }
  return [...years.values()].sort((a, b) => b.year.localeCompare(a.year));
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
      const saleYear = taxYear(order.date_of_sale);
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
        orderBoughtFrom(order, products),
        orderCostYearLabel(order, products),
        saleYear,
        orderTax(order, products).toFixed(2),
      ];
    });
}

const isNumber = (text: string) => /^-?\d+(\.\d+)?$/.test(text);
// Spreadsheet formula guard: text starting with = + - @ gets a leading ' so Excel/Sheets keep it as text.
const guard = (text: string) => (/^[=+\-@]/.test(text) ? `'${text}` : text);

export function toCsv(rows: string[][]) {
  const cell = (value: string) => (isNumber(value) ? value : `"${guard(value).replaceAll('"', '""')}"`);
  return `﻿${[ACCOUNT_HEADERS, ...rows].map((row) => row.map(cell).join(",")).join("\n")}`;
}

export function toTsv(rows: string[][]) {
  const cell = (value: string) => (isNumber(value) ? value : guard(value.replace(/[\t\r\n]+/g, " ").trim()));
  return rows.map((row) => row.map(cell).join("\t")).join("\n");
}

// Money input from a form or request: empty, missing, negative or non-numeric is null (never silently £0).
export function parseMoney(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

// A sale recorded against a product from the admin (Vinted or direct), as opposed to a website checkout.
export function isRecordedSale(order: { source: string; item_id?: string }) {
  return ["vinted", "manual"].includes(order.source) && Boolean(order.item_id);
}

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

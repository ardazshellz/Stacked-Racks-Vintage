import test from "node:test";
import assert from "node:assert/strict";
import { accountRows, isRecordedSale, isTaxYear, orderPurchaseCost, parseMoney, saleStage, taxEstimate, taxSummary, taxYear, toCsv, toTsv, type SaleOrder } from "../lib/sales.ts";

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

test("parseMoney rejects empty and invalid values instead of saving £0", () => {
  assert.equal(parseMoney(""), null);
  assert.equal(parseMoney("   "), null);
  assert.equal(parseMoney(null), null);
  assert.equal(parseMoney(-1), null);
  assert.equal(parseMoney("abc"), null);
  assert.equal(parseMoney(0), 0);
  assert.equal(parseMoney("27.5"), 27.5);
});

test("isRecordedSale covers Vinted and direct sales linked to a product", () => {
  assert.equal(isRecordedSale({ source: "vinted", item_id: "p1" }), true);
  assert.equal(isRecordedSale({ source: "manual", item_id: "p1" }), true);
  assert.equal(isRecordedSale({ source: "manual", item_id: "" }), false);
  assert.equal(isRecordedSale({ source: "stripe", item_id: "p1" }), false);
});

test("taxYear switches on 6 April", () => {
  assert.equal(taxYear("2026-04-05T12:00:00Z"), "2025-26");
  assert.equal(taxYear("2026-04-06T12:00:00Z"), "2026-27");
  assert.equal(taxYear("2026-10-03T10:00:00Z"), "2026-27");
  assert.equal(taxYear("2000-01-15"), "1999-00");
  assert.equal(taxYear(""), "");
  assert.equal(taxYear("nonsense"), "");
});

test("isTaxYear accepts only consecutive years", () => {
  assert.equal(isTaxYear("2024-25"), true);
  assert.equal(isTaxYear("1999-00"), true);
  assert.equal(isTaxYear("2024-26"), false);
  assert.equal(isTaxYear("2024"), false);
  assert.equal(isTaxYear(""), false);
});

test("taxEstimate: same or unknown year deducts cost, earlier year taxes the full price", () => {
  assert.equal(taxEstimate(23, 6.85, "2026-27", "2026-27"), 3.23);
  assert.equal(taxEstimate(23, 6.85, "2026-27", ""), 3.23);
  assert.equal(taxEstimate(27, 15, "2026-27", "2024-25"), 5.4);
  // Bought 2025-26, sold 2026-27: not yet deducted, so only the profit is taxed.
  assert.equal(taxEstimate(30, 10, "2026-27", "2025-26"), 4);
  assert.equal(taxEstimate(10, 15, "2026-27", "2026-27"), -1);
});

test("account rows add bought-from, cost year, sale year and tax estimate", () => {
  const order = { ...base, fulfilment_status: "delivered", items: [{ id: "p1", costPrice: 15, boughtFrom: "Fleek", costTaxYear: "2024-25" }] };
  const row = accountRows([order], [])[0];
  assert.deepEqual(row.slice(11), ["Fleek", "2024-25", "2026-27", "5.40"]);
  const fallback = accountRows([{ ...order, items: [{ id: "p1", costPrice: 15 }] }], [{ id: "p1", name: "x", source: "Ben Whitley", costTaxYear: "2024-25" }])[0];
  assert.deepEqual(fallback.slice(11, 13), ["Ben Whitley", "2024-25"]);
});

test("taxSummary totals confirmed sales per sale year and earlier-year costs to claim", () => {
  const sold = { ...base, fulfilment_status: "delivered" };
  const orders = [
    { ...sold, id: "A", items: [{ costPrice: 15, costTaxYear: "2024-25" }] },
    { ...sold, id: "B", price: 23, total: 23, items: [{ costPrice: 6.85, costTaxYear: "2026-27" }] },
    { ...base, id: "C", items: [{ costPrice: 15, costTaxYear: "2024-25" }] },
  ];
  const summary = taxSummary(orders, []);
  // Including paid sales not yet delivered adds order C (2024-25 stock, taxed on the full price).
  assert.equal(taxSummary(orders, [], true).find((row) => row.year === "2026-27")?.sales, 3);
  const y2627 = summary.find((row) => row.year === "2026-27");
  const y2425 = summary.find((row) => row.year === "2024-25");
  assert.deepEqual(y2627, { year: "2026-27", sales: 2, revenue: 50, costsDeducted: 6.85, tax: 8.63, costsToClaim: 0 });
  assert.deepEqual(y2425, { year: "2024-25", sales: 0, revenue: 0, costsDeducted: 0, tax: 0, costsToClaim: 15 });
});

test("a cost year after the sale year is not treated as earlier", () => {
  assert.equal(taxEstimate(27, 15, "2025-26", "2026-27"), 2.4);
});

test("taxYear uses UK time: 00:30 BST on 6 April is the new tax year", () => {
  assert.equal(taxYear("2026-04-05T23:30:00+00:00"), "2026-27");
  assert.equal(taxYear("2026-04-05T22:30:00Z"), "2025-26");
});

test("multi-item orders are taxed per item with each item's own cost year", () => {
  const order = { ...base, fulfilment_status: "delivered", price: 50, total: 50, items: [
    { id: "a", price: 30, costPrice: 15, costTaxYear: "2024-25" },
    { id: "b", price: 20, costPrice: 5, costTaxYear: "2026-27" },
  ] };
  const row = accountRows([order], [])[0];
  assert.equal(row[12], "mixed");
  assert.equal(row[14], "9.00");
  const summary = taxSummary([order], []);
  assert.deepEqual(summary.find((line) => line.year === "2026-27"), { year: "2026-27", sales: 1, revenue: 50, costsDeducted: 5, tax: 9, costsToClaim: 0 });
  assert.equal(summary.find((line) => line.year === "2024-25")?.costsToClaim, 15);
});

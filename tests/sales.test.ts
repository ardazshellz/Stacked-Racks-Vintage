import test from "node:test";
import assert from "node:assert/strict";
import { accountRows, isRecordedSale, orderPurchaseCost, parseMoney, saleStage, toCsv, toTsv, type SaleOrder } from "../lib/sales.ts";

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

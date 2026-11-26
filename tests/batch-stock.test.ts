import test from "node:test";
import assert from "node:assert/strict";
import { bundleSold } from "../lib/batch-stock.ts";

test("bundle sold counts tagged sales, skips returns and other orders", () => {
  const sales = [
    { notes: "Cost £17.34, Fleek apparel hub #181609; 2026-27.", fulfilment_status: "dispatched", payment_status: "paid" },
    { notes: "Fleek apparel hub #181609", fulfilment_status: "returned", payment_status: "paid" },
    { notes: "Creed #182508", fulfilment_status: "paid", payment_status: "paid" },
    { notes: "#1816090 other", fulfilment_status: "paid", payment_status: "paid" },
    { notes: "Sold on Vinted", fulfilment_status: "delivered", payment_status: "paid", items: [{ boughtFrom: "Fleek (apparel hub #181609)" }] },
  ];
  assert.equal(bundleSold("Order #181609 · bought through another account", sales), 2);
  assert.equal(bundleSold("no order number", sales), null);
});

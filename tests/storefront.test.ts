import test from "node:test";
import assert from "node:assert/strict";
import { calculatePostage, FREE_SHIPPING_THRESHOLD, STANDARD_POSTAGE } from "../lib/shipping.ts";
import { productPath, productSlug } from "../lib/product-url.ts";

test("postage is charged below £50", () => {
  assert.equal(calculatePostage(FREE_SHIPPING_THRESHOLD - 0.01), STANDARD_POSTAGE);
});

test("postage is free at and above £50", () => {
  assert.equal(calculatePostage(50), 0);
  assert.equal(calculatePostage(120), 0);
});

test("product URLs are readable and stable", () => {
  const product = { id: "abc-123", name: "90s Nike Track Jacket" } as Parameters<typeof productPath>[0];
  assert.equal(productSlug(product.name), "90s-nike-track-jacket");
  assert.equal(productPath(product), "/products/abc-123/90s-nike-track-jacket");
});

test("product slugs safely handle punctuation", () => {
  assert.equal(productSlug("Women's Carhartt WIP — Coat!"), "womens-carhartt-wip-coat");
});

import test from "node:test";
import assert from "node:assert/strict";
import { calculatePostage, FREE_SHIPPING_THRESHOLD, STANDARD_POSTAGE } from "../lib/shipping.ts";
import { productPath, productSlug } from "../lib/product-url.ts";
import { correctMarketingText, discountedPrices, generateCampaignDraft, normalizePromotionCode } from "../lib/promotions.ts";
import { productGenderLabel, productMatchesGender, productMatchesSize, productSizeLabel, type Product } from "../lib/products.ts";

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

test("promotion codes are normalised and discounts round per item", () => {
  assert.equal(normalizePromotionCode(" weekend 15! "), "WEEKEND15");
  assert.deepEqual(discountedPrices([13, 14.99], 10), [11.7, 13.49]);
});

test("campaign generator includes recommended products and an optional offer", () => {
  const draft = generateCampaignDraft({
    keywords: "90s tees, disounted weekend drop",
    recommendedItems: "Nike centre swoosh tee\nPink Floyd graphic tee",
    promotionCode: "weekend15",
    percentOff: 15,
  });
  assert.match(draft.subject, /90s tees/);
  assert.match(draft.body, /Nike centre swoosh tee/);
  assert.match(draft.body, /WEEKEND15/);
  assert.match(draft.body, /15%/);
  assert.match(draft.body, /^HELLO STACKER,/);
  assert.match(draft.body, /Thank you,\nThe Stacked Racks Team/);
  assert.match(draft.body, /stackedracksvintage\.co\.uk/);
  assert.match(draft.body, /vinted\.co\.uk/);
  assert.doesNotMatch(draft.subject, /disounted/);
});

test("marketing copy corrects common spelling errors", () => {
  assert.equal(correctMarketingText("nike jumpers disounted and avaible"), "Nike jumpers discounted and available");
});

test("one dual-fit product appears in both departments without duplicating stock", () => {
  const product = {
    gender: "Mens",
    size: "XS",
    secondaryGender: "Womens",
    secondarySize: "M",
    displaySize: "Men's XS / Women's M",
    stock: 1,
  } as Product;

  assert.equal(productMatchesGender(product, "Mens"), true);
  assert.equal(productMatchesGender(product, "Womens"), true);
  assert.equal(productMatchesSize(product, "XS", "Mens"), true);
  assert.equal(productMatchesSize(product, "M", "Womens"), true);
  assert.equal(productMatchesSize(product, "M", "Mens"), false);
  assert.equal(product.stock, 1);
  assert.equal(productGenderLabel(product), "Men's + Women's");
  assert.equal(productSizeLabel(product), "Men's XS / Women's M");
});

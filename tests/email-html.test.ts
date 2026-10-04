import test from "node:test";
import assert from "node:assert/strict";
import { campaignHtml } from "../lib/email-html.ts";

const unsubscribeUrl = "https://stackedracksvintage.co.uk/unsubscribe";

test("product URLs become complete yellow item links", () => {
  const first = "https://stackedracksvintage.co.uk/products/abc-123/";
  const second = "https://stackedracksvintage.co.uk/products/DEF_456/blue-top";
  const html = campaignHtml(`${first}\n${second}`, "Preview", unsubscribeUrl);
  assert.match(html, /<a href="https:\/\/stackedracksvintage\.co\.uk\/products\/abc-123\/" style="color:#F5C300">View item →<\/a>/);
  assert.match(html, /<a href="https:\/\/stackedracksvintage\.co\.uk\/products\/DEF_456\/blue-top" style="color:#F5C300">View item →<\/a>/);
  assert.equal((html.match(/View item →/g) ?? []).length, 2);
  assert.doesNotMatch(html, /stackedracksvintage\.co\.uk<\/a>\/products/);
});

test("shop, Vinted and site links keep their existing labels", () => {
  const html = campaignHtml("https://stackedracksvintage.co.uk/shop\nhttps://www.vinted.co.uk/member/59714764-stackedracks\nhttps://stackedracksvintage.co.uk", "", unsubscribeUrl);
  assert.match(html, /href="https:\/\/stackedracksvintage\.co\.uk\/shop"[^>]*>Shop the latest drop →<\/a>/);
  assert.match(html, /href="https:\/\/www\.vinted\.co\.uk\/member\/59714764-stackedracks"[^>]*>Stacked Racks on Vinted<\/a>/);
  assert.match(html, /href="https:\/\/stackedracksvintage\.co\.uk"[^>]*>stackedracksvintage\.co\.uk<\/a>/);
});

test("body and preview text are escaped before link markup is added", () => {
  const html = campaignHtml('<script>alert("x")</script> <sr-product-0> __SR_SHOP_LINK__', '<img src=x onerror="bad">', unsubscribeUrl);
  assert.doesNotMatch(html, /<script>|<img|<sr-product-0>/);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(html, /&lt;sr-product-0&gt; __SR_SHOP_LINK__/);
  assert.match(html, /&lt;img src=x onerror=&quot;bad&quot;&gt;/);
  assert.doesNotMatch(html, /View item →/);
});

test("full-width table and cell carry the near-black background", () => {
  const html = campaignHtml("Hello", "", unsubscribeUrl);
  assert.match(html, /<table[^>]*width="100%"[^>]*bgcolor="#0a0a0a"[^>]*style="[^"]*background-color:#0a0a0a"/);
  assert.match(html, /<td[^>]*bgcolor="#0a0a0a"[^>]*style="background-color:#0a0a0a"/);
  assert.match(html, /max-width:600px/);
});

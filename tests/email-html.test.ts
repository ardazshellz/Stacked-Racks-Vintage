import test from "node:test";
import assert from "node:assert/strict";
import { campaignHtml, dropEmailHtml, validDropItemId, welcomeEmailHtml } from "../lib/email-html.ts";

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
  assert.doesNotMatch(html, /<script>|<img src=x|<sr-product-0>/);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(html, /&lt;sr-product-0&gt; __SR_SHOP_LINK__/);
  assert.match(html, /&lt;img src=x onerror=&quot;bad&quot;&gt;/);
  assert.doesNotMatch(html, /View item →/);
});

test("full-width table and cell carry the near-black background", () => {
  const html = campaignHtml("Hello", "", unsubscribeUrl);
  assert.match(html, /<table[^>]*width="100%"[^>]*bgcolor="#0A0A0A"[^>]*style="[^"]*background-color:#0A0A0A;background-image:linear-gradient\(#0A0A0A,#0A0A0A\)/);
  assert.match(html, /<td[^>]*bgcolor="#0A0A0A"[^>]*style="background-color:#0A0A0A;/);
  assert.match(html, /max-width:600px/);
});

test("all email types emit the Gmail dark-mode document and keep preview first", () => {
  const examples = [dropEmailHtml(drop), campaignHtml("Hello", "Preview <safe>", unsubscribeUrl), welcomeEmailHtml("CODE", unsubscribeUrl)];
  for (const html of examples) {
    assert.ok(html.startsWith("<!doctype html>"));
    assert.match(html, /<meta name="color-scheme" content="light dark">/);
    assert.match(html, /<meta name="supported-color-schemes" content="light dark">/);
    assert.match(html, /<body class="body"[^>]*background-image:linear-gradient\(#0A0A0A,#0A0A0A\)/);
    assert.match(html, /u \+ \.body \.gmail-blend-screen \{ background:#000; mix-blend-mode:screen; \}/);
    assert.match(html, /u \+ \.body \.gmail-blend-difference \{ background:#000; mix-blend-mode:difference; \}/);
    assert.match(html, /<div class="gmail-blend-screen"><div class="gmail-blend-difference">/);
    assert.match(html, /bgcolor="#E8500A"[^>]*background-image:linear-gradient\(#E8500A,#E8500A\)/);
    assert.match(html, /border-image:linear-gradient\(#E8500A,#E8500A\) 1/);
    assert.ok(html.indexOf('style="display:none;max-height:0;overflow:hidden"') < html.indexOf('<table role="presentation"'));
  }
  assert.match(examples[1], /Preview &lt;safe&gt;/);
});

const drop = {
  items: [{ id: "abc-123", name: "Nike <script>alert(1)</script>", size: "Men's M / Women's L", price: 45, imageUrls: ["https://example.com/shirt.jpg?x=1&y=2"] }],
  intro: "Fresh <b>pieces</b>",
  dateLine: "SUNDAY 4 OCTOBER",
  unsubscribeUrl: "https://stackedracksvintage.co.uk/unsubscribe?token=a&source=drop",
};

test("drop email uses the reference colours, layout and item details", () => {
  const html = dropEmailHtml(drop);
  assert.match(html, /bgcolor="#0A0A0A"/);
  assert.match(html, /max-width:600px/);
  assert.match(html, /border-left:5px solid #E8500A/);
  assert.match(html, /color:#F5C300[^>]*><div class="gmail-blend-screen"><div class="gmail-blend-difference">NEW DROP/);
  assert.match(html, /padding:38px 16px 38px/);
  assert.match(html, /src="https:\/\/stackedracksvintage\.co\.uk\/email-wordmark\.png"[^>]*alt="Stacked Racks Vintage"[^>]*width="300"/);
  assert.match(html, /SUNDAY 4 OCTOBER/);
  assert.match(html, /1 piece/);
  assert.match(html, /£45\.00/);
  assert.match(html, /Free UK delivery over £50/);
  assert.match(html, /href="https:\/\/stackedracksvintage\.co\.uk\/shop"/);
});

test("drop item text, intro, image URL and unsubscribe URL are escaped", () => {
  const html = dropEmailHtml(drop);
  assert.doesNotMatch(html, /<script>|<b>pieces<\/b>/);
  assert.match(html, /Nike &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /Fresh &lt;b&gt;pieces&lt;\/b&gt;/);
  assert.match(html, /Men's M \/ Women's L/);
  assert.match(html, /src="https:\/\/example\.com\/shirt\.jpg\?x=1&amp;y=2"/);
  assert.match(html, /href="https:\/\/stackedracksvintage\.co\.uk\/unsubscribe\?token=a&amp;source=drop"/);
});

test("drop item cards show the size on its own line without repeating it in the title", () => {
  const html = dropEmailHtml({
    ...drop,
    items: [{ ...drop.items[0], name: "Metallica Vintage T-Shirt – Men's S / Women's M", size: "Men's S / Women's M" }],
  });
  assert.match(html, /alt="Metallica Vintage T-Shirt"/);
  assert.match(html, /Metallica Vintage T-Shirt<\/div><\/div><\/td><\/tr><tr><td[^>]*>\s*<div class="gmail-blend-screen"><div class="gmail-blend-difference">Men's S \/ Women's M/);
  assert.doesNotMatch(html, /Metallica Vintage T-Shirt – Men's S/);
});

test("promo appears only when enabled", () => {
  assert.doesNotMatch(dropEmailHtml(drop), /OFF THE DROP|Use code/);
  assert.doesNotMatch(dropEmailHtml({ ...drop, promotion: { enabled: false, percentOff: 10, code: "DROP10" } }), /OFF THE DROP|Use code/);
  const html = dropEmailHtml({ ...drop, promotion: { enabled: true, percentOff: 10, code: "DROP<10" } });
  assert.match(html, /10% OFF THE DROP/);
  assert.match(html, /Use code <strong>DROP&lt;10<\/strong> at checkout/);
  assert.match(html, /bgcolor="#F5C300"[^>]*background-image:linear-gradient\(#F5C300,#F5C300\)/);
});

test("three valid items occupy two fixed two-column rows with an empty last cell", () => {
  const items = [
    { id: "one", name: "First", size: "S", price: 10, imageUrls: ["https://example.com/first.jpg"] },
    { id: "two", name: "Second", size: "M", price: 20 },
    { id: "three", name: "Third", size: "L", price: 30 },
  ];
  for (const html of [dropEmailHtml({ ...drop, items }), campaignHtml("Hello", "", unsubscribeUrl, items), welcomeEmailHtml("CODE", unsubscribeUrl, items)]) {
    assert.equal((html.match(/<tr class="item-row">/g) ?? []).length, 2);
    assert.equal((html.match(/<td class="item-card" width="50%"/g) ?? []).length, 3);
    assert.match(html, /<tr class="item-row">[\s\S]*?First[\s\S]*?Second[\s\S]*?<\/tr><tr class="item-row">[\s\S]*?Third/);
    assert.match(html, /<td width="12" bgcolor="#0A0A0A"/);
    assert.match(html, /table-layout:fixed/);
    assert.doesNotMatch(html, /@media|display:block!important/);
    assert.match(html, /width="260" style="display:block;width:100%;max-width:260px;height:auto/);
  }
});

test("item URLs use validated ids and unsafe image or unsubscribe URLs are omitted", () => {
  const html = dropEmailHtml({
    ...drop,
    items: [drop.items[0], { id: "../bad", name: "Bad", size: "S", price: 1, imageUrls: ["javascript:alert(1)"] }, { id: 42, name: "Good", size: "L", price: 20, imageUrls: ["javascript:alert(1)"] }],
    unsubscribeUrl: "javascript:alert(1)",
  });
  assert.match(html, /href="https:\/\/stackedracksvintage\.co\.uk\/products\/abc-123\/"/);
  assert.match(html, /href="https:\/\/stackedracksvintage\.co\.uk\/products\/42\/"/);
  assert.doesNotMatch(html, /products\/\.\.\/bad|javascript:|>Bad<|>Unsubscribe</);
  assert.equal((html.match(/View item →/g) ?? []).length, 2);
  assert.equal(validDropItemId("abc_DEF-123"), true);
  assert.equal(validDropItemId("a/b"), false);
  assert.equal(validDropItemId(0), false);
  assert.equal(validDropItemId(Number.MAX_SAFE_INTEGER + 1), false);
});

test("campaign uses the shared wordmark, ordered cards and recipient unsubscribe", () => {
  const html = campaignHtml("New <pieces> today", "Preview", "https://stackedracksvintage.co.uk/unsubscribe?token=a&x=1", [
    { id: "second", name: "Second shirt", size: "M", price: 20 },
    { id: "first", name: "First shirt", size: "S", price: 10 },
  ]);
  assert.match(html, /email-wordmark\.png/);
  assert.ok(html.indexOf("Second shirt") < html.indexOf("First shirt"));
  assert.match(html, /New &lt;pieces&gt; today/);
  assert.match(html, /unsubscribe\?token=a&amp;x=1/);
  assert.equal((html.match(/View item →/g) ?? []).length, 2);
});

test("welcome email includes escaped code and latest drop cards", () => {
  const html = welcomeEmailHtml("RACKS-<10>", unsubscribeUrl, [drop.items[0]]);
  assert.match(html, /email-wordmark\.png/);
  assert.match(html, /Your 10% off code/);
  assert.match(html, /RACKS-&lt;10&gt;/);
  assert.match(html, /LATEST DROP/);
  assert.match(html, /Nike &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /£45\.00/);
  assert.doesNotMatch(html, /<script>/);
});

test("welcome email still renders code when there are no items", () => {
  const html = welcomeEmailHtml("RACKS-ABC", unsubscribeUrl);
  assert.match(html, /RACKS-ABC/);
  assert.doesNotMatch(html, /LATEST DROP/);
});

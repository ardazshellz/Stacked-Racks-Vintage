import test from "node:test";
import assert from "node:assert/strict";
import { campaignHtml, dropEmailHtml, validDropItemId, welcomeEmailHtml } from "../lib/email-html.ts";

const unsubscribeUrl = "https://stackedracksvintage.co.uk/unsubscribe";

test("product URLs become complete orange item links", () => {
  const first = "https://stackedracksvintage.co.uk/products/abc-123/";
  const second = "https://stackedracksvintage.co.uk/products/DEF_456/blue-top";
  const html = campaignHtml(`${first}\n${second}`, "Preview", unsubscribeUrl);
  assert.match(html, /<a href="https:\/\/stackedracksvintage\.co\.uk\/products\/abc-123\/" style="color:#E8500A">View item →<\/a>/);
  assert.match(html, /<a href="https:\/\/stackedracksvintage\.co\.uk\/products\/DEF_456\/blue-top" style="color:#E8500A">View item →<\/a>/);
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

test("one continuous orange frame encloses each email and its footer", () => {
  const examples = [dropEmailHtml(drop), campaignHtml("Hello", "", unsubscribeUrl), welcomeEmailHtml("CODE", unsubscribeUrl)];
  for (const html of examples) {
    assert.match(html, /<table role="presentation" width="600"[^>]*style="[^"]*border:5px solid #E8500A;border-image:linear-gradient\(#E8500A,#E8500A\) 1">/);
    assert.equal((html.match(/border:5px solid #E8500A/g) ?? []).length, 1);
    assert.doesNotMatch(html, /border-left:5px solid #E8500A|border-right:5px solid #E8500A/);
    assert.ok(html.indexOf("STACKED RACKS VINTAGE") > html.indexOf("SHOP NOW"));
    assert.match(html, /STACKED RACKS VINTAGE[\s\S]*London, UK[\s\S]*mailto:stackedracksvintage@gmail\.com[\s\S]*Shop on Vinted →[\s\S]*Unsubscribe/);
    assert.match(html, /href="https:\/\/www\.vinted\.co\.uk\/member\/59714764-stackedracks"[^>]*>Shop on Vinted →<\/a>/);
  }
});

const drop = {
  items: [{ id: "abc-123", name: "Nike <script>alert(1)</script>", size: "Men's M / Women's L", brand: "Nike", gender: "Mens" as const, secondaryGender: "Womens" as const, category: "T-Shirts & Tops", price: 45, imageUrls: ["https://example.com/shirt.jpg?x=1&y=2"] }],
  intro: "Fresh <b>pieces</b>",
  dateLine: "SUNDAY 4 OCTOBER",
  unsubscribeUrl: "https://stackedracksvintage.co.uk/unsubscribe?token=a&source=drop",
};

test("drop email uses the reference colours, layout and item details", () => {
  const html = dropEmailHtml(drop);
  assert.match(html, /bgcolor="#0A0A0A"/);
  assert.match(html, /max-width:600px/);
  assert.match(html, /border:5px solid #E8500A/);
  assert.match(html, /src="https:\/\/stackedracksvintage\.co\.uk\/email\/new-drop\.png" alt="NEW DROP" width="294"/);
  assert.match(html, /padding:38px 16px/);
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
  assert.match(html, /Fits Men's M \/ Women's L/);
  assert.match(html, /src="https:\/\/example\.com\/shirt\.jpg\?x=1&amp;y=2"/);
  assert.match(html, /href="https:\/\/stackedracksvintage\.co\.uk\/unsubscribe\?token=a&amp;source=drop"/);
});

test("drop item cards show the size on its own line without repeating it in the title", () => {
  const html = dropEmailHtml({
    ...drop,
    items: [{ ...drop.items[0], name: "Metallica Vintage T-Shirt – Men's S / Women's M", brand: "Metallica", size: "Men's S / Women's M" }],
  });
  assert.match(html, /alt="Metallica Vintage T-Shirt"/);
  assert.match(html, /color:#E8500A[^>]*>Metallica Vintage T-Shirt<\/td>/);
  assert.match(html, /Metallica · Fits Men's S \/ Women's M/);
  assert.doesNotMatch(html, /Metallica Vintage T-Shirt – Men's S/);
});

test("promo appears only when enabled", () => {
  assert.doesNotMatch(dropEmailHtml(drop), /OFF THE DROP|Use code/);
  assert.doesNotMatch(dropEmailHtml({ ...drop, promotion: { enabled: false, percentOff: 10, code: "DROP10" } }), /OFF THE DROP|Use code/);
  const html = dropEmailHtml({ ...drop, promotion: { enabled: true, percentOff: 10, code: "DROP<10" } });
  assert.match(html, /10% OFF THE DROP/);
  assert.match(html, /Use code <strong style="color:#E8500A">DROP&lt;10<\/strong> at checkout/);
  assert.match(html, /border:2px solid #E8500A/);
  assert.doesNotMatch(html, /bgcolor="#F5C300"|background-color:#F5C300/);
});

test("coloured content stays outside blend wrappers in every email", () => {
  const examples = [
    dropEmailHtml({ ...drop, promotion: { enabled: true, percentOff: 10, code: "ILOVEYOU" } }),
    campaignHtml("Visit https://stackedracksvintage.co.uk/shop", "", unsubscribeUrl, [drop.items[0]]),
    welcomeEmailHtml("ILOVEYOU", unsubscribeUrl, [drop.items[0]]),
  ];
  for (const html of examples) {
    const wrapped = [...html.matchAll(/<(div|span) class="gmail-blend-screen"><\1 class="gmail-blend-difference">([\s\S]*?)<\/\1><\/\1>/g)];
    assert.ok(wrapped.length > 0);
    for (const [, , content] of wrapped) assert.doesNotMatch(content, /color:#(?:E8500A|F5C300|0A0A0A)/i);
    assert.doesNotMatch(html, /bgcolor="#F5C300"|background-color:#F5C300/);
  }
  assert.match(examples[0], /color:#E8500A;font-size:17px;padding-top:9px">1 piece<\/div>/);
  assert.match(examples[1], /style="color:#E8500A">Shop the latest drop →<\/a>/);
});

test("cards show website metadata and an outlined orange button", () => {
  const html = dropEmailHtml(drop);
  assert.match(html, /class="item-card"[^>]*bgcolor="#111111"[^>]*border-left:1px solid #E8500A;border-right:1px solid #E8500A;width:50%;border-top:1px solid #E8500A/);
  assert.match(html, /border:1px solid #E8500A;color:#E8500A[^>]*>MEN'S \+ WOMEN'S<\/span>/);
  assert.match(html, /T-SHIRTS &amp; TOPS/);
  assert.match(html, /color:#E8500A;font-family:Arial,sans-serif;font-size:15px[^>]*>Nike &lt;script&gt;/);
  assert.match(html, /Nike · Fits Men's M \/ Women's L/);
  assert.match(html, /color:#E8500A;font-family:Arial,sans-serif;font-size:20px[^>]*>£45\.00/);
  assert.match(html, /href="https:\/\/stackedracksvintage\.co\.uk\/products\/abc-123\/" style="display:block;border:1px solid #E8500A;background-color:#0A0A0A[^>]*>VIEW ITEM<\/a>/);
});

test("three valid items place the CTA beside the last item in aligned rows", () => {
  const items = [
    { id: "one", name: "First", size: "S", price: 10, imageUrls: ["https://example.com/first.jpg"] },
    { id: "two", name: "Second", size: "M", price: 20 },
    { id: "three", name: "Third", size: "L", price: 30 },
  ];
  for (const html of [dropEmailHtml({ ...drop, items }), campaignHtml("Hello", "", unsubscribeUrl, items), welcomeEmailHtml("CODE", unsubscribeUrl, items)]) {
    const rows = [...html.matchAll(/<tr class="item-row">([\s\S]*?)<\/tr>/g)].map((match) => match[1]);
    assert.equal(rows.length, 12);
    assert.equal((html.match(/<td class="item-card" width="50%"/g) ?? []).length, 3);
    assert.match(rows[2], /First[\s\S]*Second/);
    assert.match(rows[8], /Third/);
    assert.match(rows[6], /class="cta-card"[^>]*><img src="https:\/\/stackedracksvintage\.co\.uk\/email\/new-pieces-weekly\.png" alt="New pieces weekly" width="253"/);
    assert.match(rows[6], /New one-off vintage lands every week\. Keep an eye out\./);
    assert.match(rows[11], /href="https:\/\/stackedracksvintage\.co\.uk\/shop"[^>]*>SHOP NOW<\/a>/);
    assert.match(rows[6], /class="cta-card"[^>]*align="center" valign="middle"[^>]*vertical-align:middle/);
    assert.match(rows[6], /<img [^>]*margin:0 auto[^>]*><div style="padding-top:12px;color:#E8500A[^>]*text-align:center">New one-off vintage/);
    for (const row of rows.slice(7, 11)) assert.match(row, /<td[^>]*><\/td>$/);
    assert.match(rows[11], /VIEW ITEM<\/a>[\s\S]*SHOP NOW<\/a>/);
    for (const row of rows.slice(7)) assert.equal((row.match(/valign="top" bgcolor="#111111"/g) ?? []).length, 2);
    assert.equal((html.match(/>SHOP NOW<\/a>/g) ?? []).length, 1);
    assert.match(html, /<td width="12" bgcolor="#0A0A0A"/);
    assert.match(html, /table-layout:fixed/);
    assert.doesNotMatch(html, /@media|display:block!important/);
    assert.match(html, /width="260" style="display:block;width:100%;height:auto/);
  }
});

test("even and zero item counts place one full-width CTA below the items", () => {
  const items = [
    { id: "one", name: "First", size: "S", price: 10 },
    { id: "two", name: "Second", size: "M", price: 20 },
  ];
  for (const selected of [items, []]) {
    const examples = [dropEmailHtml({ ...drop, items: selected }), campaignHtml("Hello", "", unsubscribeUrl, selected), welcomeEmailHtml("CODE", unsubscribeUrl, selected)];
    for (const html of examples) {
      assert.equal((html.match(/>SHOP NOW<\/a>/g) ?? []).length, 1);
      assert.doesNotMatch(html, /class="cta-card"/);
      assert.match(html, /<table role="presentation" width="100%"[^>]*bgcolor="#111111"[^>]*border:1px solid #E8500A/);
      assert.match(html, /src="https:\/\/stackedracksvintage\.co\.uk\/email\/new-pieces-weekly\.png" alt="New pieces weekly" width="253"/);
      assert.match(html, /New one-off vintage lands every week\. Keep an eye out\./);
      assert.match(html, /<td align="center" valign="middle"[^>]*vertical-align:middle;text-align:center[^>]*><img [^>]*><div style="padding-top:12px;color:#E8500A[^>]*>New one-off vintage[^<]*<\/div><\/td><\/tr><tr><td[^>]*><a [^>]*>SHOP NOW<\/a>/);
      if (selected.length) assert.ok(html.indexOf("Second") < html.indexOf("New one-off vintage"));
    }
  }
});

test("both cards share each content row so unequal titles leave buttons level", () => {
  const items = [
    { id: "short", name: "Short", size: "S", brand: "Nike", category: "Tops", price: 10, imageUrls: ["https://example.com/short.jpg"] },
    { id: "long", name: "A much longer title that wraps onto more than one line", size: "M", brand: "Adidas", category: "Shirts", price: 20 },
  ];
  const html = dropEmailHtml({ ...drop, items });
  const rows = [...html.matchAll(/<tr class="item-row">([\s\S]*?)<\/tr>/g)].map((match) => match[1]);
  assert.equal(rows.length, 6);
  const pairs = [
    [/short\.jpg/, /class="item-card"[^>]*border-top:1px solid #E8500A/],
    [/TOPS/, /SHIRTS/],
    [/>Short<\/td>/, /A much longer title that wraps onto more than one line/],
    [/Nike · Fits S/, /Adidas · Fits M/],
    [/£10\.00/, /£20\.00/],
    [/products\/short\/[^>]*>VIEW ITEM<\/a>/, /products\/long\/[^>]*>VIEW ITEM<\/a>/],
  ];
  for (const [index, row] of rows.entries()) {
    for (const pattern of pairs[index]) assert.match(row, pattern);
    assert.equal((row.match(/valign="top" bgcolor="#111111"/g) ?? []).length, 2);
    assert.equal((row.match(/border-left:1px solid #E8500A;border-right:1px solid #E8500A/g) ?? []).length, 2);
    assert.equal((row.match(/<td width="12"/g) ?? []).length, 1);
  }
  assert.equal((rows[0].match(/border-top:1px solid #E8500A/g) ?? []).length, 2);
  assert.equal((rows[0].match(/<img /g) ?? []).length, 1);
  assert.match(rows[0], /<td class="item-card"[^>]*><\/td>$/);
  assert.doesNotMatch(rows.slice(1).join(""), /border-top:1px solid #E8500A/);
  assert.equal((rows[5].match(/border-bottom:1px solid #E8500A/g) ?? []).length, 2);
  assert.doesNotMatch(rows.slice(0, 5).join(""), /border-bottom:1px solid #E8500A/);
  assert.doesNotMatch(rows[0], /src=""|src="undefined"/);
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
  assert.equal((html.match(/>VIEW ITEM<\/a>/g) ?? []).length, 2);
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
  assert.equal((html.match(/>VIEW ITEM<\/a>/g) ?? []).length, 2);
});

test("welcome email includes escaped code and latest drop cards", () => {
  const html = welcomeEmailHtml("RACKS-<10>", unsubscribeUrl, [drop.items[0]]);
  assert.match(html, /email-wordmark\.png/);
  assert.match(html, /src="https:\/\/stackedracksvintage\.co\.uk\/email\/your-10-off-code\.png" alt="YOUR 10% OFF CODE" width="535"/);
  assert.match(html, /RACKS-&lt;10&gt;/);
  assert.match(html, /src="https:\/\/stackedracksvintage\.co\.uk\/email\/latest-drop\.png" alt="LATEST DROP" width="355"/);
  assert.match(html, /Nike &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /£45\.00/);
  assert.doesNotMatch(html, /<script>/);
});

test("welcome email still renders code when there are no items", () => {
  const html = welcomeEmailHtml("RACKS-ABC", unsubscribeUrl);
  assert.match(html, /RACKS-ABC/);
  assert.doesNotMatch(html, /latest-drop\.png/);
});

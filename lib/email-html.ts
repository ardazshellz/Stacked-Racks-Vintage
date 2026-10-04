import { websiteProductTitle } from "./products.ts";

const site = "https://stackedracksvintage.co.uk";
const dark = "#0A0A0A";
const orange = "#E8500A";
const yellow = "#F5C300";
const headlineFont = "'Big Shoulders Display',Impact,'Arial Narrow Bold','Arial Black',sans-serif";

function escapeHtml(value: unknown) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function background(color: string) {
  return `background-color:${color};background-image:linear-gradient(${color},${color})`;
}

function orangeSides() {
  return `border-left:5px solid ${orange};border-right:5px solid ${orange};border-image:linear-gradient(${orange},${orange}) 1`;
}

function blend(text: string, inline = false) {
  const tag = inline ? "span" : "div";
  return `<${tag} class="gmail-blend-screen"><${tag} class="gmail-blend-difference">${text}</${tag}></${tag}>`;
}

function orangeRule() {
  return `<tr><td bgcolor="${orange}" height="5" style="${background(orange)};height:5px;font-size:0;line-height:0">&nbsp;</td></tr>`;
}

export type DropEmailItem = {
  id: string | number;
  name: string;
  size: string;
  price: number;
  imageUrls?: string[];
};

export function validDropItemId(value: unknown): value is string | number {
  if (typeof value === "number") return Number.isSafeInteger(value) && value > 0;
  return typeof value === "string" && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value);
}

function safeHttpsUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function emailHeader() {
  return `<tr><td align="center" bgcolor="${dark}" style="${background(dark)};padding:28px 20px 30px;${orangeSides()}"><img src="${site}/email-wordmark.png" alt="Stacked Racks Vintage" width="300" style="display:block;width:100%;max-width:300px;height:auto;border:0"></td></tr>`;
}

function emailFooter(unsubscribeUrl: string) {
  const unsubscribe = safeHttpsUrl(unsubscribeUrl);
  const unsubscribeHtml = unsubscribe
    ? ` <a href="${escapeHtml(unsubscribe)}" style="color:#AAAAAA;text-decoration:underline">Unsubscribe</a>.`
    : "";
  return `${orangeRule()}<tr><td align="center" bgcolor="${dark}" style="${background(dark)};padding:24px 18px 32px;${orangeSides()};color:#C8C8C8;font-family:Arial,sans-serif;font-size:14px;line-height:1.7">${blend("Free UK delivery over £50")}<div style="padding-top:10px">${blend(`<a href="${site}/shop" style="color:${yellow};font-weight:bold;text-decoration:none">Shop the latest drop →</a>`)}</div><div style="padding-top:28px;color:#888888;font-size:12px">${blend(`You are receiving this because you joined the Stacked Racks email list.${unsubscribeHtml}`)}</div></td></tr>`;
}

function emailShell(content: string, unsubscribeUrl: string, previewText = "") {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><style>u + .body .gmail-blend-screen { background:#000; mix-blend-mode:screen; } u + .body .gmail-blend-difference { background:#000; mix-blend-mode:difference; }</style></head><body class="body" bgcolor="${dark}" style="margin:0;padding:0;${background(dark)}"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(previewText)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${dark}" style="width:100%;${background(dark)}"><tr><td align="center" bgcolor="${dark}" style="${background(dark)};padding:0 10px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${dark}" style="width:100%;max-width:600px;${background(dark)}">${emailHeader()}${content}${emailFooter(unsubscribeUrl)}</table></td></tr></table></body></html>`;
}

function emailHeading(title: string) {
  return `${orangeRule()}<tr><td align="center" bgcolor="${dark}" style="${background(dark)};padding:38px 16px 38px;${orangeSides()};color:${yellow};font-family:${headlineFont};font-size:72px;font-weight:900;line-height:1;letter-spacing:2px;text-transform:uppercase">${blend(escapeHtml(title))}</td></tr>${orangeRule()}`;
}

function itemCards(items: DropEmailItem[]) {
  const validItems = items.filter((item) => validDropItemId(item.id));
  const rows: string[] = [];
  for (let index = 0; index < validItems.length; index += 2) {
    const cards = validItems.slice(index, index + 2).map((item) => {
      const title = websiteProductTitle(item.name);
      const image = safeHttpsUrl(item.imageUrls?.[0]);
      const imageHtml = image
        ? `<tr><td bgcolor="${dark}" style="${background(dark)}"><img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" width="260" style="display:block;width:100%;max-width:260px;height:auto;border:0"></td></tr>`
        : "";
      const itemUrl = `${site}/products/${item.id}/`;
      const price = Number.isFinite(item.price) ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(item.price) : "";
      return `<td class="item-card" width="50%" valign="top" bgcolor="${dark}" style="width:50%;vertical-align:top;${background(dark)}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${dark}" style="width:100%;${background(dark)}">${imageHtml}<tr><td bgcolor="${dark}" style="${background(dark)};padding:12px 0 4px;color:#FFFFFF;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;line-height:1.3">${blend(escapeHtml(title))}</td></tr><tr><td bgcolor="${dark}" style="${background(dark)};color:#C8C8C8;font-family:Arial,sans-serif;font-size:13px;line-height:1.5">${blend(escapeHtml(item.size))}</td></tr><tr><td bgcolor="${dark}" style="${background(dark)};padding:6px 0 12px;color:${orange};font-family:Arial,sans-serif;font-size:20px;font-weight:bold">${blend(escapeHtml(price))}</td></tr><tr><td bgcolor="${dark}" style="${background(dark)};padding-bottom:18px"><a href="${itemUrl}" bgcolor="${yellow}" style="display:inline-block;${background(yellow)};color:${dark};font-family:Arial,sans-serif;font-size:13px;font-weight:bold;text-decoration:none;padding:10px 12px">${blend("View item →", true)}</a></td></tr></table></td>`;
    });
    rows.push(`<tr class="item-row">${cards[0]}<td width="12" bgcolor="${dark}" style="width:12px;${background(dark)};font-size:0">&nbsp;</td>${cards[1] ?? `<td width="50%" bgcolor="${dark}" style="width:50%;${background(dark)}">&nbsp;</td>`}</tr>`);
  }
  return rows.length
    ? `<tr><td bgcolor="${dark}" style="${background(dark)};padding:18px 14px 8px;${orangeSides()}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${dark}" style="width:100%;table-layout:fixed;${background(dark)}">${rows.join("")}</table></td></tr>`
    : "";
}

export function dropEmailHtml(input: {
  items: DropEmailItem[];
  intro: string;
  dateLine: string;
  promotion?: { enabled: boolean; percentOff: number; code: string };
  unsubscribeUrl: string;
}): string {
  const count = input.items.length;
  const promo = input.promotion?.enabled && Number.isInteger(input.promotion.percentOff)
    && input.promotion.percentOff >= 1 && input.promotion.percentOff <= 90
    ? `<tr><td bgcolor="${yellow}" style="${background(yellow)};padding:19px 24px;text-align:center;color:${dark};font-family:Arial,sans-serif"><div style="font-family:${headlineFont};font-size:32px;font-weight:900;line-height:1.1;text-transform:uppercase">${blend(`${input.promotion.percentOff}% OFF THE DROP`)}</div><div style="font-size:15px;line-height:1.5;padding-top:6px">${blend(`Use code <strong>${escapeHtml(input.promotion.code)}</strong> at checkout`)}</div></td></tr>`
    : "";
  const content = `${emailHeading("NEW DROP")}<tr><td align="center" bgcolor="${dark}" style="${background(dark)};padding:20px 20px 24px;${orangeSides()};font-family:Arial,sans-serif"><div style="color:#FFFFFF;font-size:22px;font-weight:bold;line-height:1.3;text-transform:uppercase">${blend(escapeHtml(input.dateLine))}</div><div style="color:${yellow};font-size:17px;padding-top:9px">${blend(`${count} ${count === 1 ? "piece" : "pieces"}`)}</div></td></tr>${promo}<tr><td bgcolor="${dark}" style="${background(dark)};padding:24px 24px 6px;${orangeSides()};color:#DDDDDD;font-family:Arial,sans-serif;font-size:16px;line-height:1.6">${blend(escapeHtml(input.intro).replaceAll("\n", "<br>"))}</td></tr>${itemCards(input.items)}`;
  return emailShell(content, input.unsubscribeUrl);
}

function campaignContent(body: string) {
  const productUrls: string[] = [];
  return escapeHtml(body)
    .replace(/https:\/\/stackedracksvintage\.co\.uk\/products\/[A-Za-z0-9/_-]+/g, (url) => {
      const index = productUrls.push(url) - 1;
      return `<sr-product-${index}>`;
    })
    .replaceAll("https://stackedracksvintage.co.uk/shop", "<sr-shop-link>")
    .replaceAll("https://www.vinted.co.uk/member/59714764-stackedracks", "<sr-vinted-link>")
    .replaceAll("https://stackedracksvintage.co.uk", '<a href="https://stackedracksvintage.co.uk" style="color:#F5C300">stackedracksvintage.co.uk</a>')
    .replaceAll("<sr-shop-link>", '<a href="https://stackedracksvintage.co.uk/shop" style="color:#F5C300">Shop the latest drop →</a>')
    .replaceAll("<sr-vinted-link>", '<a href="https://www.vinted.co.uk/member/59714764-stackedracks" style="color:#F5C300">Stacked Racks on Vinted</a>')
    .replace(/<sr-product-(\d+)>/g, (_, index: string) => `<a href="${productUrls[Number(index)]}" style="color:#F5C300">View item →</a>`)
    .replaceAll("\n", "<br>");
}

export function campaignHtml(body: string, previewText: string, unsubscribeUrl: string, items: DropEmailItem[] = []) {
  const content = `${orangeRule()}<tr><td bgcolor="${dark}" style="${background(dark)};padding:28px 24px;${orangeSides()};color:#DDDDDD;font-family:Arial,sans-serif;font-size:16px;line-height:1.7">${blend(campaignContent(body))}</td></tr>${itemCards(items)}`;
  return emailShell(content, unsubscribeUrl, previewText);
}

export function welcomeEmailHtml(code: string, unsubscribeUrl: string, items: DropEmailItem[] = []) {
  const content = `${emailHeading("Your 10% off code")}<tr><td bgcolor="${dark}" style="${background(dark)};padding:24px;${orangeSides()};color:#DDDDDD;font-family:Arial,sans-serif;font-size:16px;line-height:1.6">${blend("Thanks for signing up. Enter this code in the discount-code box on our checkout page.")}<div bgcolor="${dark}" style="${background(dark)};border:1px solid ${orange};border-image:linear-gradient(${orange},${orange}) 1;padding:20px;text-align:center;margin:24px 0">${blend(`<strong style="color:${orange};font-size:28px;letter-spacing:5px">${escapeHtml(code)}</strong>`)}</div></td></tr>${items.length ? `${emailHeading("LATEST DROP")}${itemCards(items)}` : ""}`;
  return emailShell(content, unsubscribeUrl);
}

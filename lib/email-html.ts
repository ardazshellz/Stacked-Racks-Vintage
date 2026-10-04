import { websiteProductTitle } from "./products.ts";

const site = "https://stackedracksvintage.co.uk";
const dark = "#0A0A0A";
const orange = "#E8500A";
const yellow = "#F5C300";
const headlineFont = "'Big Shoulders Display',Impact,'Arial Narrow Bold','Arial Black',sans-serif";

function escapeHtml(value: unknown) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
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
  return `<tr><td align="center" bgcolor="${dark}" style="background-color:${dark};padding:28px 20px 30px;border-left:5px solid ${orange};border-right:5px solid ${orange}"><img src="${site}/email-wordmark.png" alt="Stacked Racks Vintage" width="300" style="display:block;width:100%;max-width:300px;height:auto;border:0"></td></tr>`;
}

function emailFooter(unsubscribeUrl: string) {
  const unsubscribe = safeHttpsUrl(unsubscribeUrl);
  const unsubscribeHtml = unsubscribe
    ? ` <a href="${escapeHtml(unsubscribe)}" style="color:#AAAAAA;text-decoration:underline">Unsubscribe</a>.`
    : "";
  return `<tr><td bgcolor="${orange}" height="5" style="background-color:${orange};height:5px;font-size:0;line-height:0">&nbsp;</td></tr><tr><td align="center" bgcolor="${dark}" style="background-color:${dark};padding:24px 18px 32px;border-left:5px solid ${orange};border-right:5px solid ${orange};color:#C8C8C8;font-family:Arial,sans-serif;font-size:14px;line-height:1.7"><div>Free UK delivery over £50</div><div style="padding-top:10px"><a href="${site}/shop" style="color:${yellow};font-weight:bold;text-decoration:none">Shop the latest drop →</a></div><div style="padding-top:28px;color:#888888;font-size:12px">You are receiving this because you joined the Stacked Racks email list.${unsubscribeHtml}</div></td></tr>`;
}

function emailShell(content: string, unsubscribeUrl: string, previewText = "") {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body bgcolor="${dark}" style="margin:0;padding:0;background-color:${dark}"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(previewText)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${dark}" style="width:100%;background-color:${dark}"><tr><td align="center" bgcolor="${dark}" style="background-color:${dark};padding:0 10px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${dark}" style="width:100%;max-width:600px;background-color:${dark}">${emailHeader()}${content}${emailFooter(unsubscribeUrl)}</table></td></tr></table></body></html>`;
}

function emailHeading(title: string) {
  return `<tr><td bgcolor="${orange}" height="5" style="background-color:${orange};height:5px;font-size:0;line-height:0">&nbsp;</td></tr><tr><td align="center" bgcolor="${dark}" style="background-color:${dark};padding:38px 16px 38px;border-left:5px solid ${orange};border-right:5px solid ${orange};color:${yellow};font-family:${headlineFont};font-size:72px;font-weight:900;line-height:1;letter-spacing:2px;text-transform:uppercase">${escapeHtml(title)}</td></tr><tr><td bgcolor="${orange}" height="5" style="background-color:${orange};height:5px;font-size:0;line-height:0">&nbsp;</td></tr>`;
}

function itemCards(items: DropEmailItem[]) {
  return items.map((item) => {
    if (!validDropItemId(item.id)) return "";
    const title = websiteProductTitle(item.name);
    const image = safeHttpsUrl(item.imageUrls?.[0]);
    const imageHtml = image
      ? `<tr><td bgcolor="${dark}" style="background-color:${dark}"><img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0"></td></tr>`
      : "";
    const itemUrl = `${site}/products/${item.id}/`;
    const price = Number.isFinite(item.price) ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(item.price) : "";
    return `<tr><td bgcolor="${dark}" style="background-color:${dark};padding:24px 20px 8px;border-left:5px solid ${orange};border-right:5px solid ${orange}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${dark}" style="width:100%;background-color:${dark}">${imageHtml}<tr><td bgcolor="${dark}" style="background-color:${dark};padding:18px 0 4px;color:#FFFFFF;font-family:Arial,sans-serif;font-size:21px;font-weight:bold;line-height:1.3">${escapeHtml(title)}</td></tr><tr><td bgcolor="${dark}" style="background-color:${dark};color:#C8C8C8;font-family:Arial,sans-serif;font-size:15px;line-height:1.5">${escapeHtml(item.size)}</td></tr><tr><td bgcolor="${dark}" style="background-color:${dark};padding:6px 0 18px;color:${orange};font-family:Arial,sans-serif;font-size:24px;font-weight:bold">${escapeHtml(price)}</td></tr><tr><td bgcolor="${dark}" style="background-color:${dark};padding-bottom:20px"><a href="${itemUrl}" style="display:inline-block;background-color:${yellow};color:${dark};font-family:Arial,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:13px 22px">View item →</a></td></tr></table></td></tr>`;
  }).join("");
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
    ? `<tr><td bgcolor="${yellow}" style="background-color:${yellow};padding:19px 24px;text-align:center;color:${dark};font-family:Arial,sans-serif"><div style="font-family:${headlineFont};font-size:32px;font-weight:900;line-height:1.1;text-transform:uppercase">${input.promotion.percentOff}% OFF THE DROP</div><div style="font-size:15px;line-height:1.5;padding-top:6px">Use code <strong>${escapeHtml(input.promotion.code)}</strong> at checkout</div></td></tr>`
    : "";
  const content = `${emailHeading("NEW DROP")}<tr><td align="center" bgcolor="${dark}" style="background-color:${dark};padding:20px 20px 24px;border-left:5px solid ${orange};border-right:5px solid ${orange};font-family:Arial,sans-serif"><div style="color:#FFFFFF;font-size:22px;font-weight:bold;line-height:1.3;text-transform:uppercase">${escapeHtml(input.dateLine)}</div><div style="color:${yellow};font-size:17px;padding-top:9px">${count} ${count === 1 ? "piece" : "pieces"}</div></td></tr>${promo}<tr><td bgcolor="${dark}" style="background-color:${dark};padding:24px 24px 6px;border-left:5px solid ${orange};border-right:5px solid ${orange};color:#DDDDDD;font-family:Arial,sans-serif;font-size:16px;line-height:1.6">${escapeHtml(input.intro).replaceAll("\n", "<br>")}</td></tr>${itemCards(input.items)}`;
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
  const content = `<tr><td bgcolor="${orange}" height="5" style="background-color:${orange};height:5px;font-size:0;line-height:0">&nbsp;</td></tr><tr><td bgcolor="${dark}" style="background-color:${dark};padding:28px 24px;border-left:5px solid ${orange};border-right:5px solid ${orange};color:#DDDDDD;font-family:Arial,sans-serif;font-size:16px;line-height:1.7">${campaignContent(body)}</td></tr>${itemCards(items)}`;
  return emailShell(content, unsubscribeUrl, previewText);
}

export function welcomeEmailHtml(code: string, unsubscribeUrl: string, items: DropEmailItem[] = []) {
  const content = `${emailHeading("Your 10% off code")}<tr><td bgcolor="${dark}" style="background-color:${dark};padding:24px;border-left:5px solid ${orange};border-right:5px solid ${orange};color:#DDDDDD;font-family:Arial,sans-serif;font-size:16px;line-height:1.6">Thanks for signing up. Enter this code in the discount-code box on our checkout page.<div style="background:#111;border:1px solid ${orange};padding:20px;text-align:center;margin:24px 0"><strong style="color:${orange};font-size:28px;letter-spacing:5px">${escapeHtml(code)}</strong></div></td></tr>${items.length ? `${emailHeading("LATEST DROP")}${itemCards(items)}` : ""}`;
  return emailShell(content, unsubscribeUrl);
}

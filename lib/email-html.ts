import { productGenderLabel, websiteProductTitle, type Product } from "./products.ts";

const site = "https://stackedracksvintage.co.uk";
const dark = "#0A0A0A";
const orange = "#E8500A";
const headlineFont = "'Big Shoulders Display',Impact,'Arial Narrow Bold','Arial Black',sans-serif";

function escapeHtml(value: unknown) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function background(color: string) {
  return `background-color:${color};background-image:linear-gradient(${color},${color})`;
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
  gender?: Product["gender"];
  secondaryGender?: Product["secondaryGender"];
  category?: string;
  brand?: string;
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
  return `<tr><td align="center" bgcolor="${dark}" style="${background(dark)};padding:28px 20px 30px"><img src="${site}/email-wordmark.png" alt="Stacked Racks Vintage" width="300" style="display:block;width:100%;max-width:300px;height:auto;border:0"></td></tr>`;
}

function emailFooter(unsubscribeUrl: string) {
  const unsubscribe = safeHttpsUrl(unsubscribeUrl);
  const unsubscribeHtml = unsubscribe
    ? ` <a href="${escapeHtml(unsubscribe)}" style="color:#AAAAAA;text-decoration:underline">Unsubscribe</a>.`
    : "";
  return `${orangeRule()}<tr><td align="center" bgcolor="${dark}" style="${background(dark)};padding:24px 18px 32px;color:#C8C8C8;font-family:Arial,sans-serif;font-size:14px;line-height:1.7">${blend("Free UK delivery over £50")}<div style="padding-top:10px"><a href="${site}/shop" style="color:${orange};font-weight:bold;text-decoration:none">Shop the latest drop →</a></div><div style="padding-top:26px;color:${orange};font-weight:bold;letter-spacing:2px">STACKED RACKS VINTAGE</div><div style="color:#AAAAAA">${blend("London, UK")}</div><div><a href="mailto:stackedracksvintage@gmail.com" style="color:${orange};text-decoration:none">stackedracksvintage@gmail.com</a></div><div><a href="https://www.vinted.co.uk/member/59714764-stackedracks" style="color:${orange};text-decoration:none">Shop on Vinted →</a></div><div style="padding-top:28px;color:#AAAAAA;font-size:12px">${blend(`You are receiving this because you joined the Stacked Racks email list.${unsubscribeHtml}`)}</div></td></tr>`;
}

function emailShell(content: string, unsubscribeUrl: string, previewText = "") {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><style>u + .body .gmail-blend-screen { background:#000; mix-blend-mode:screen; } u + .body .gmail-blend-difference { background:#000; mix-blend-mode:difference; }</style></head><body class="body" bgcolor="${dark}" style="margin:0;padding:0;${background(dark)}"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(previewText)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${dark}" style="width:100%;${background(dark)}"><tr><td align="center" bgcolor="${dark}" style="${background(dark)};padding:0 10px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${dark}" style="width:100%;max-width:600px;${background(dark)};border:5px solid ${orange};border-image:linear-gradient(${orange},${orange}) 1">${emailHeader()}${content}${emailFooter(unsubscribeUrl)}</table></td></tr></table></body></html>`;
}

function emailHeading(title: "NEW DROP" | "LATEST DROP" | "YOUR 10% OFF CODE") {
  const images = {
    "NEW DROP": { file: "new-drop.png", width: 294 },
    "LATEST DROP": { file: "latest-drop.png", width: 355 },
    "YOUR 10% OFF CODE": { file: "your-10-off-code.png", width: 535 },
  };
  const image = images[title];
  return `${orangeRule()}<tr><td align="center" bgcolor="${dark}" style="${background(dark)};padding:38px 16px"><img src="${site}/email/${image.file}" alt="${title}" width="${image.width}" style="display:block;width:100%;max-width:${image.width}px;height:auto;border:0"></td></tr>${orangeRule()}`;
}

function ctaImage() {
  return `<img src="${site}/email/new-pieces-every-3-days.png" alt="New pieces every 3 days" width="253" style="display:block;width:100%;max-width:253px;height:auto;border:0;margin:0 auto">`;
}

function ctaButton() {
  return `<a href="${site}/shop" style="display:block;border:1px solid ${orange};${background(dark)};color:${orange};font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1.4px;text-align:center;text-decoration:none;padding:10px 4px">SHOP NOW</a>`;
}

const ctaCopy = "New one-off vintage lands every 3 days. Keep an eye out.";

function ctaContent() {
  return `${ctaImage()}<div style="padding-top:12px;color:${orange};font-family:Arial,sans-serif;font-size:15px;line-height:1.3;text-align:center">${ctaCopy}</div>`;
}

function fullWidthCta() {
  return `<tr><td bgcolor="${dark}" style="${background(dark)};padding:18px 14px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#111111" style="width:100%;${background("#111111")};border:1px solid ${orange}"><tr><td align="center" valign="middle" style="vertical-align:middle;text-align:center;padding:20px 16px 14px">${ctaContent()}</td></tr><tr><td align="center" style="padding:0 16px 18px">${ctaButton()}</td></tr></table></td></tr>`;
}

function itemCards(items: DropEmailItem[]) {
  const validItems = items.filter((item) => validDropItemId(item.id));
  const rows: string[] = [];
  const cardBackground = background("#111111");
  const cardSides = `border-left:1px solid ${orange};border-right:1px solid ${orange}`;
  const gutter = `<td width="12" bgcolor="${dark}" style="width:12px;${background(dark)};font-size:0">&nbsp;</td>`;
  const cardCell = (content: string, style: string, extra = "", valign = "top") =>
    `<td ${extra}valign="${valign}" bgcolor="#111111" style="vertical-align:${valign};${cardBackground};${cardSides};${style}">${content}</td>`;
  for (let index = 0; index < validItems.length; index += 2) {
    const cards = validItems.slice(index, index + 2).map((item) => {
      const title = websiteProductTitle(item.name);
      const image = safeHttpsUrl(item.imageUrls?.[0]);
      const imageHtml = image
        ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" width="260" style="display:block;width:100%;height:auto;border:0">`
        : "";
      const itemUrl = `${site}/products/${item.id}/`;
      const price = Number.isFinite(item.price) ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(item.price) : "";
      const gender = item.gender ? productGenderLabel(item as Product).toUpperCase() : "";
      const genderHtml = gender ? `<span style="display:inline-block;border:1px solid ${orange};color:${orange};font-family:Arial,sans-serif;font-size:9px;font-weight:bold;letter-spacing:1.2px;padding:4px 5px">${escapeHtml(gender)}</span>` : "";
      const categoryHtml = item.category ? `<span style="display:inline-block;color:#AAAAAA;font-family:Arial,sans-serif;font-size:9px;font-weight:bold;letter-spacing:1.1px;padding-left:6px">${blend(escapeHtml(item.category.toUpperCase()), true)}</span>` : "";
      const fit = item.brand ? `${item.brand} · Fits ${item.size}` : `Fits ${item.size}`;
      return [
        cardCell(imageHtml, `width:50%;border-top:1px solid ${orange}`, 'class="item-card" width="50%" '),
        cardCell(`${genderHtml}${categoryHtml}`, "padding:10px 9px 3px"),
        cardCell(escapeHtml(title), `padding:7px 9px 4px;color:${orange};font-family:Arial,sans-serif;font-size:15px;font-weight:bold;line-height:1.3`),
        cardCell(blend(escapeHtml(fit)), "padding:0 9px;color:#C8C8C8;font-family:Arial,sans-serif;font-size:12px;line-height:1.5"),
        cardCell(escapeHtml(price), `padding:8px 9px 10px;color:${orange};font-family:Arial,sans-serif;font-size:20px;font-weight:bold`),
        cardCell(`<a href="${itemUrl}" style="display:block;border:1px solid ${orange};${background(dark)};color:${orange};font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1.4px;text-align:center;text-decoration:none;padding:10px 4px">VIEW ITEM</a>`, `padding:0 9px 10px;border-bottom:1px solid ${orange}`),
      ];
    });
    const ctaCells = validItems.length % 2 && index === validItems.length - 1
      ? [
        cardCell(ctaContent(), `width:50%;text-align:center;padding:12px 8px;border-top:1px solid ${orange}`, 'class="cta-card" width="50%" align="center" ', "middle"),
        cardCell("", "padding:0 9px"),
        cardCell("", "padding:0 9px"),
        cardCell("", "padding:0 9px"),
        cardCell("", "padding:8px 9px 10px"),
        cardCell(ctaButton(), `padding:0 9px 10px;border-bottom:1px solid ${orange}`),
      ]
      : null;
    for (let part = 0; part < 6; part += 1) {
      rows.push(`<tr class="item-row">${cards[0][part]}${gutter}${cards[1]?.[part] ?? ctaCells?.[part]}</tr>`);
    }
  }
  return rows.length
    ? `<tr><td bgcolor="${dark}" style="${background(dark)};padding:18px 14px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${dark}" style="width:100%;table-layout:fixed;${background(dark)}">${rows.join("")}</table></td></tr>${validItems.length % 2 ? "" : fullWidthCta()}`
    : fullWidthCta();
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
    ? `<tr><td bgcolor="${dark}" style="${background(dark)};border:2px solid ${orange};padding:19px 24px;text-align:center;color:${orange};font-family:Arial,sans-serif"><div style="color:${orange};font-family:${headlineFont};font-size:32px;font-weight:900;line-height:1.1;text-transform:uppercase">${input.promotion.percentOff}% OFF THE DROP</div><div style="color:${orange};font-size:15px;line-height:1.5;padding-top:6px">Use code <strong style="color:${orange}">${escapeHtml(input.promotion.code)}</strong> at checkout</div></td></tr>`
    : "";
  const intro = input.intro.trim()
    ? `<tr><td bgcolor="${dark}" style="${background(dark)};padding:24px 24px 6px;color:#DDDDDD;font-family:Arial,sans-serif;font-size:16px;line-height:1.6">${blend(escapeHtml(input.intro).replaceAll("\n", "<br>"))}</td></tr>`
    : "";
  const content = `${emailHeading("NEW DROP")}<tr><td align="center" bgcolor="${dark}" style="${background(dark)};padding:20px 20px 24px;font-family:Arial,sans-serif"><div style="color:#FFFFFF;font-size:22px;font-weight:bold;line-height:1.3;text-transform:uppercase">${blend(escapeHtml(input.dateLine))}</div><div style="color:${orange};font-size:17px;padding-top:9px">${count} ${count === 1 ? "piece" : "pieces"}</div></td></tr>${promo}${intro}${itemCards(input.items)}`;
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
    .replaceAll("https://stackedracksvintage.co.uk", `<a href="https://stackedracksvintage.co.uk" style="color:${orange}">stackedracksvintage.co.uk</a>`)
    .replaceAll("<sr-shop-link>", `<a href="https://stackedracksvintage.co.uk/shop" style="color:${orange}">Shop the latest drop →</a>`)
    .replaceAll("<sr-vinted-link>", `<a href="https://www.vinted.co.uk/member/59714764-stackedracks" style="color:${orange}">Stacked Racks on Vinted</a>`)
    .replace(/<sr-product-(\d+)>/g, (_, index: string) => `<a href="${productUrls[Number(index)]}" style="color:${orange}">View item →</a>`)
    .split(/(<a [^>]*>[^<]*<\/a>)/g)
    .map((part) => part.startsWith("<a ") ? part : blend(part.replaceAll("\n", "<br>"), true))
    .join("");
}

export function campaignHtml(body: string, previewText: string, unsubscribeUrl: string, items: DropEmailItem[] = []) {
  const content = `${orangeRule()}<tr><td bgcolor="${dark}" style="${background(dark)};padding:28px 24px;color:#DDDDDD;font-family:Arial,sans-serif;font-size:16px;line-height:1.7">${campaignContent(body)}</td></tr>${itemCards(items)}`;
  return emailShell(content, unsubscribeUrl, previewText);
}

export function welcomeEmailHtml(code: string, unsubscribeUrl: string, items: DropEmailItem[] = []) {
  const content = `${emailHeading("YOUR 10% OFF CODE")}<tr><td bgcolor="${dark}" style="${background(dark)};padding:24px;color:#DDDDDD;font-family:Arial,sans-serif;font-size:16px;line-height:1.6">${blend("Thanks for signing up. Enter this code in the discount-code box on our checkout page.")}<div bgcolor="${dark}" style="${background(dark)};border:1px solid ${orange};border-image:linear-gradient(${orange},${orange}) 1;padding:20px;text-align:center;margin:24px 0"><strong style="color:${orange};font-size:28px;letter-spacing:5px">${escapeHtml(code)}</strong></div></td></tr>${items.length ? emailHeading("LATEST DROP") : ""}${itemCards(items)}`;
  return emailShell(content, unsubscribeUrl);
}

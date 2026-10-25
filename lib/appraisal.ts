// Seller fees checked on the official pages, 25 Oct 2026. Update here when a platform changes them.
// Website: stripe.com/gb/pricing (standard UK cards). Vinted: vinted.co.uk/help/1653 (buyers pay the Vinted fee).
// Depop: depop.com/help/seller-fees-and-charges (no selling fee in the UK, Stripe processing still applies).
// eBay: ebay.co.uk/help/selling/fees-credits-invoices/fees-private-sellers-activated-managed-payments (free for UK private sellers).
export const PLATFORM_FEES = [
  { platform: "Website", percent: 1.5, fixed: 0.2, note: "Stripe, UK cards" },
  { platform: "Vinted", percent: 0, fixed: 0, note: "No selling fee" },
  { platform: "Depop", percent: 2.9, fixed: 0.3, note: "Payment processing" },
  { platform: "eBay", percent: 0, fixed: 0, note: "Free for private sellers" },
] as const;

const round2 = (value: number) => Math.round(value * 100) / 100;

// ponytail: fees are worked out on the item price only; Stripe and Depop also charge on buyer-paid postage (pennies).
export function platformProfits(price: number, cost = 0) {
  return PLATFORM_FEES.map(({ platform, percent, fixed, note }) => {
    const fee = price > 0 ? round2((price * percent) / 100 + fixed) : 0;
    return { platform, note, fee, payout: round2(price - fee), profit: round2(price - fee - cost) };
  });
}

// The middle of the AI range: not the bargain-bin low end, not the hopeful top.
export function goldilocksPrice(low?: number, high?: number) {
  if (low && high) return Math.round((low + high) / 2);
  return low || high || undefined;
}

const DETAIL_PHOTO = /label|tag|care|detail|logo|code/i;

// Picks which photos the AI sees when there are more than it can take. Keeps the cover, then label and
// detail shots by file name, then the last photos (tags go last in every listing). Original order is kept.
export function pickAnalysisPhotos(urls: string[], max = 8) {
  if (urls.length <= max) return urls;
  const ranked = [0, ...urls.flatMap((url, index) => (index > 0 && DETAIL_PHOTO.test(url) ? [index] : []))];
  for (let index = urls.length - 1; index > 0; index--) if (!ranked.includes(index)) ranked.push(index);
  return ranked.slice(0, max).sort((a, b) => a - b).map((index) => urls[index]);
}

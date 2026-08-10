export function normalizePromotionCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);
}

export function discountedPrices(prices: number[], percentOff: number) {
  const safePercent = Math.min(100, Math.max(0, Number(percentOff) || 0));
  return prices.map((price) => Number((Number(price) * (1 - safePercent / 100)).toFixed(2)));
}

export interface CampaignDraftInput {
  keywords: string;
  recommendedItems?: string;
  promotionCode?: string;
  percentOff?: number;
}

export function generateCampaignDraft(input: CampaignDraftInput) {
  const keywords = input.keywords.split(/[,\n]/).map((word) => word.trim()).filter(Boolean);
  const focus = keywords.slice(0, 3).join(", ") || "fresh vintage arrivals";
  const items = String(input.recommendedItems ?? "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
  const code = normalizePromotionCode(input.promotionCode);
  const offer = code && input.percentOff
    ? `Use code ${code} for ${input.percentOff}% off at checkout.`
    : "Shop early while these one-off pieces are still available.";
  const recommendations = items.length
    ? `Our current picks:\n${items.slice(0, 5).map((item) => `• ${item}`).join("\n")}`
    : "Take a look at the latest one-off pieces added to the shop.";

  return {
    subject: `New at Stacked Racks: ${focus}`.slice(0, 120),
    previewText: `Fresh vintage picks, including ${focus}.`.slice(0, 160),
    body: `A fresh selection has just landed at Stacked Racks Vintage.\n\n${recommendations}\n\n${offer}\n\nEvery item is a one-off, so once it is gone, it is gone.\n\nShop the latest drop: https://stackedracksvintage.co.uk/shop`,
  };
}

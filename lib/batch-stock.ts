// Bundle stock left: sales whose notes or item supplier name the bundle's Fleek order number (e.g. "#181609"), minus returns and refunds.
type SaleRow = { notes?: string | null; fulfilment_status?: string | null; payment_status?: string | null; items?: { boughtFrom?: string }[] | null };

export function bundleOrderNumber(purchaseNotes: string): string | null {
  return purchaseNotes.match(/Order #(\d{4,})/)?.[1] ?? null;
}

export function bundleSold(purchaseNotes: string, sales: SaleRow[]): number | null {
  const number = bundleOrderNumber(purchaseNotes);
  if (!number) return null;
  const tag = new RegExp(`#${number}(?!\\d)`);
  return sales.filter((sale) => tag.test(`${sale.notes ?? ""} ${(sale.items ?? []).map((item) => item.boughtFrom ?? "").join(" ")}`) && !/returned|refunded/.test(`${sale.fulfilment_status} ${sale.payment_status}`)).length;
}

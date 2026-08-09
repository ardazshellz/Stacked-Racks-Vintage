import "server-only";

import type { Product } from "@/lib/products";
import { rowToProduct, type ProductRow } from "@/lib/product-db";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { PRODUCT_SETTINGS_NAME, parseProductSettings } from "@/lib/server/product-settings";

export async function getPublicProducts(): Promise<Product[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as ProductRow[];
  const settingsRow = rows.find((row) => row.name === PRODUCT_SETTINGS_NAME);
  const settings = parseProductSettings(settingsRow?.description);
  const unavailable = new Set([...settings.hiddenProductIds, ...settings.deletedProductIds]);

  return rows
    .filter((row) => {
      const reserved = row.reserved_until && new Date(row.reserved_until).getTime() > Date.now();
      return row.name !== PRODUCT_SETTINGS_NAME && !unavailable.has(String(row.id)) && !reserved;
    })
    .map(rowToProduct);
}

export async function getPublicProduct(id: string): Promise<Product | null> {
  const products = await getPublicProducts();
  return products.find((product) => String(product.id) === id) ?? null;
}

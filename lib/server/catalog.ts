import "server-only";

import { publicProduct, type Product } from "@/lib/products";
import { rowToProduct, type ProductRow } from "@/lib/product-db";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { PRODUCT_SETTINGS_NAME, parseProductSettings } from "@/lib/server/product-settings";

import { publicProducts } from "@/lib/listing-schedule";

/** Owner-only fields are stripped unless includePrivate is set (owner views only). */
export async function getPublicProducts(includePrivate = false): Promise<Product[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as ProductRow[];
  const settingsRow = rows.find((row) => row.name === PRODUCT_SETTINGS_NAME);
  const settings = parseProductSettings(settingsRow?.description);
  return publicProducts(rows
    .filter((row) => {
      const reserved = row.reserved_until && new Date(row.reserved_until).getTime() > Date.now();
      return row.name !== PRODUCT_SETTINGS_NAME && !reserved;
    })
    .map(rowToProduct), settings)
    .map((product) => (includePrivate ? product : publicProduct(product)));
}

export async function getPublicProduct(id: string, includePrivate = false): Promise<Product | null> {
  const products = await getPublicProducts(includePrivate);
  return products.find((product) => String(product.id) === id) ?? null;
}

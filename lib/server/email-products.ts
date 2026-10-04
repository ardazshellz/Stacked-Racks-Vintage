import "server-only";

import { publicProducts } from "@/lib/listing-schedule";
import { rowToProduct, type ProductRow } from "@/lib/product-db";
import { publicProduct } from "@/lib/products";
import { validDropItemId } from "@/lib/email-html";
import { getProductSettings, PRODUCT_SETTINGS_NAME } from "@/lib/server/product-settings";
import { getSupabaseAdmin } from "@/lib/server/supabase";

/** The same available catalogue powers the picker, campaign validation and welcome cards. */
export async function loadPublicEmailProducts(ids?: string[]) {
  let query = getSupabaseAdmin().from("products").select("*").gt("stock", 0).order("created_at", { ascending: false });
  if (ids) query = query.in("id", ids);
  const [result, settings] = await Promise.all([query, getProductSettings()]);
  if (result.error) throw result.error;
  const rows = (result.data ?? []) as (ProductRow & { created_at?: string })[];
  const visible = publicProducts(rows
    .filter((row) => row.name !== PRODUCT_SETTINGS_NAME && (!row.reserved_until || Date.parse(row.reserved_until) <= Date.now()))
    .map(rowToProduct), settings);
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const chronology = (id: string, listedDate: string) => settings.scheduledReleases[id] ?? `${listedDate}T00:00:00.000Z`;
  const items = visible
    .filter((item) => validDropItemId(item.id))
    .sort((a, b) => chronology(String(b.id), b.listedDate).localeCompare(chronology(String(a.id), a.listedDate))
      || String(rowsById.get(String(b.id))?.created_at ?? "").localeCompare(String(rowsById.get(String(a.id))?.created_at ?? "")))
    .map(publicProduct);
  return { items, scheduledReleases: settings.scheduledReleases };
}

import { getSupabaseAdmin } from "./supabase";

export const PRODUCT_SETTINGS_NAME = "__STACKED_RACKS_PRODUCT_SETTINGS__";

import { parseProductSettings, type ProductSettings } from "../listing-schedule";
export { parseProductSettings, type ProductSettings } from "../listing-schedule";

export async function getProductSettings(): Promise<ProductSettings> {
  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .select("description")
    .eq("name", PRODUCT_SETTINGS_NAME)
    .maybeSingle();
  if (error) throw error;
  return parseProductSettings(data?.description);
}

export async function saveProductSettings(settings: ProductSettings) {
  const supabase = getSupabaseAdmin();
  const description = JSON.stringify(settings);
  const { data: existing, error: readError } = await supabase
    .from("products")
    .select("id")
    .eq("name", PRODUCT_SETTINGS_NAME)
    .maybeSingle();
  if (readError) throw readError;

  if (existing?.id) {
    const { error } = await supabase
      .from("products")
      .update({ description, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("products").insert({
    name: PRODUCT_SETTINGS_NAME,
    brand: "Vintage",
    size: "M",
    gender: "Mens",
    price: 0.01,
    category: "Jackets",
    badge: "NEW",
    rare_badge: null,
    stock: 0,
    condition: "Good",
    era: "2020s",
    fit: "Regular",
    listed_date: new Date().toISOString().slice(0, 10),
    description,
    editorial_story: null,
    image_urls: [],
    vinted_title: null,
    vinted_description: null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

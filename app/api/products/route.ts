import { NextResponse } from "next/server";
import type { Product } from "@/lib/products";
import { productToRow, rowToProduct, type ProductRow } from "@/lib/product-db";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import {
  PRODUCT_SETTINGS_NAME,
  parseProductSettings,
  getProductSettings,
  saveProductSettings,
} from "@/lib/server/product-settings";
import { sameOrigin } from "@/lib/server/request-security";

function validProduct(value: unknown): value is Omit<Product, "id"> {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<Product>;
  return Boolean(
    p.name?.trim() &&
      p.brand?.trim() &&
      p.category &&
      p.size &&
      p.price &&
      Number.isFinite(Number(p.price)) &&
      Number(p.price) > 0,
  );
}

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = data as ProductRow[];
    const settingsRow = rows.find((row) => row.name === PRODUCT_SETTINGS_NAME);
    const settings = parseProductSettings(settingsRow?.description);
    const admin = await isAdminRequest();
    return NextResponse.json({
      products: rows
        .filter((row) => row.name !== PRODUCT_SETTINGS_NAME)
        .filter((row) => admin || !row.reserved_until || new Date(row.reserved_until).getTime() <= Date.now())
        .map((row) => {
          const product = rowToProduct(row);
          return admin ? product : {
            ...product,
            sku: undefined,
            costPrice: undefined,
            storageLocation: undefined,
            source: undefined,
          };
        }),
      ...settings,
    });
  } catch (error) {
    console.error("Products fetch failed:", error);
    return NextResponse.json({ products: [], databaseReady: false });
  }
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const product = (await req.json()) as unknown;
  if (!validProduct(product)) {
    return NextResponse.json({ error: "Please complete the required product fields" }, { status: 400 });
  }
  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .insert(productToRow(product))
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: rowToProduct(data as ProductRow) }, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const body = (await req.json()) as {
    id?: string;
    product?: unknown;
    visibility?: { id?: string; hidden?: boolean; deleted?: boolean };
  };
  if (body.visibility?.id) {
    try {
      const id = String(body.visibility.id);
      const settings = await getProductSettings();
      const hidden = new Set(settings.hiddenProductIds);
      const deleted = new Set(settings.deletedProductIds);
      if (body.visibility.hidden) hidden.add(id);
      else hidden.delete(id);
      if (body.visibility.deleted) {
        deleted.add(id);
        hidden.delete(id);
      }
      await saveProductSettings({ hiddenProductIds: [...hidden], deletedProductIds: [...deleted] });
      return NextResponse.json({ updated: true });
    } catch (error) {
      console.error("Product visibility update failed:", error);
      return NextResponse.json({ error: "Could not update product visibility" }, { status: 500 });
    }
  }
  if (!body.id || !validProduct(body.product)) {
    return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  }
  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .update(productToRow(body.product))
    .eq("id", body.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: rowToProduct(data as ProductRow) });
}

export async function DELETE(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing product id" }, { status: 400 });
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) {
    try {
      const settings = await getProductSettings();
      await saveProductSettings({
        hiddenProductIds: settings.hiddenProductIds.filter((productId) => productId !== id),
        deletedProductIds: [...new Set([...settings.deletedProductIds, id])],
      });
      return NextResponse.json({ deleted: true });
    } catch (error) {
      console.error("Placeholder product deletion failed:", error);
      return NextResponse.json({ error: "Could not delete placeholder product" }, { status: 500 });
    }
  }
  const { error } = await getSupabaseAdmin().from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { publicProduct, type Product } from "@/lib/products";
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

import { assignReleaseSlots, publicProducts, validRelease, validScheduleConfig, type ScheduleConfig } from "@/lib/listing-schedule";

export const dynamic = "force-dynamic";

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

export async function GET(req: Request) {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = data as ProductRow[];
    const settingsRow = rows.find((row) => row.name === PRODUCT_SETTINGS_NAME);
    const settings = parseProductSettings(settingsRow?.description);
    const admin = new URL(req.url).searchParams.get("admin") === "true" && await isAdminRequest();
    const visible = rows.filter(row => row.name !== PRODUCT_SETTINGS_NAME)
      .filter(row => admin || !row.reserved_until || Date.parse(row.reserved_until) <= Date.now()).map(rowToProduct);
    return NextResponse.json({
      products: (admin ? visible : publicProducts(visible, settings))
        .map((product) => (admin ? product : publicProduct(product))),
      ...(admin ? settings : { hiddenProductIds: [], deletedProductIds: [] }),
    }, { headers: { "Cache-Control": "private, no-store" } });
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
  const id = randomUUID();
  if ((product as { hidden?: boolean }).hidden === true) {
    try {
      const settings = await getProductSettings();
      settings.hiddenProductIds.push(id);
      await saveProductSettings(settings);
    } catch {
      return NextResponse.json({ error: "Could not save private listing" }, { status: 500 });
    }
  }
  const { data, error } = await getSupabaseAdmin()
    .from("products")
    .insert({ ...productToRow(product), id })
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
    schedule?: { id?: string; at?: string; auto?: string[] };
    scheduleConfig?: Partial<ScheduleConfig>;
    id?: string;
    product?: unknown;
    hidden?: boolean;
    visibility?: { id?: string; hidden?: boolean; deleted?: boolean };
  };
  if (body.schedule !== undefined || body.scheduleConfig !== undefined) {
    try {
      const settings = await getProductSettings();
      if (body.scheduleConfig !== undefined) {
        if (!body.scheduleConfig || typeof body.scheduleConfig !== "object" || Array.isArray(body.scheduleConfig)) return NextResponse.json({ error: "Invalid schedule configuration" }, { status: 400 });
        const config = { ...settings.scheduleConfig, ...body.scheduleConfig };
        if (!validScheduleConfig(config)) return NextResponse.json({ error: "Use batch size 1–100, interval 1–365 days, a valid start date and UK hour 0–23" }, { status: 400 });
        settings.scheduleConfig = config;
      }
      if (body.schedule !== undefined) {
        const action = body.schedule;
        if (!action || typeof action !== "object" || Array.isArray(action)) return NextResponse.json({ error: "Invalid schedule action" }, { status: 400 });
        const auto = action.auto !== undefined;
        if (auto ? (!Array.isArray(action.auto) || !action.auto.length || action.auto.length > 100 || action.id !== undefined || action.at !== undefined) : (typeof action.id !== "string" || !action.id)) return NextResponse.json({ error: "Specify one item or up to 100 queue items" }, { status: 400 });
        if (!auto && action.at !== undefined && !validRelease(action.at)) return NextResponse.json({ error: "Release time must be an ISO datetime with a timezone" }, { status: 400 });
        const ids = auto ? [...new Set(action.auto!)] : [action.id!];
        if (ids.some(id => typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) || settings.deletedProductIds.includes(id))) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
        const { data, error } = await getSupabaseAdmin().from("products").select("*").in("id", ids).neq("name", PRODUCT_SETTINGS_NAME);
        if (error) throw error;
        if (!data || data.length !== ids.length) return NextResponse.json({ error: "Product not found" }, { status: 404 });
        if (auto || action.at !== undefined) {
          const products = (data as ProductRow[]).map(rowToProduct);
          if (products.some(p => p.listingStatus === "draft" || p.stock < 1 || p.pricingStatus === "needs_review")) return NextResponse.json({ error: "Review the listing and pricing and ensure it is in stock before scheduling" }, { status: 400 });
          settings.scheduledReleases = auto ? assignReleaseSlots(settings, ids) : { ...settings.scheduledReleases, [ids[0]]: new Date(action.at!).toISOString() };
          settings.hiddenProductIds = settings.hiddenProductIds.filter(id => !ids.includes(id));
        } else {
          delete settings.scheduledReleases[ids[0]];
          // Removing from the queue is safe: keep the item private.
          settings.hiddenProductIds = [...new Set([...settings.hiddenProductIds, ids[0]])];
        }
      }
      await saveProductSettings(settings);
      return NextResponse.json({ updated: true, ...settings });
    } catch (error) {
      console.error("Product schedule update failed:", error);
      return NextResponse.json({ error: "Could not update release schedule" }, { status: 500 });
    }
  }
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
      if (Date.parse(settings.scheduledReleases[id] ?? "") > Date.now()) delete settings.scheduledReleases[id];
      await saveProductSettings({ ...settings, hiddenProductIds: [...hidden], deletedProductIds: [...deleted] });
      return NextResponse.json({ updated: true });
    } catch (error) {
      console.error("Product visibility update failed:", error);
      return NextResponse.json({ error: "Could not update product visibility" }, { status: 500 });
    }
  }
  if (!body.id || !validProduct(body.product)) {
    return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  }
  if (body.hidden === true) {
    try {
      const settings = await getProductSettings();
      settings.hiddenProductIds = [...new Set([...settings.hiddenProductIds, body.id])];
      delete settings.scheduledReleases[body.id];
      await saveProductSettings(settings);
    } catch {
      return NextResponse.json({ error: "Could not save private listing" }, { status: 500 });
    }
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
        ...settings,
        hiddenProductIds: settings.hiddenProductIds.filter((productId) => productId !== id),
        deletedProductIds: [...new Set([...settings.deletedProductIds, id])],
      });
      return NextResponse.json({ deleted: true });
    } catch (error) {
      console.error("Placeholder product deletion failed:", error);
      return NextResponse.json({ error: "Could not delete placeholder product" }, { status: 500 });
    }
  }
  // Remove queue occupancy before deleting, while keeping the item hidden.
  try {
    const settings = await getProductSettings();
    delete settings.scheduledReleases[id];
    settings.hiddenProductIds = [...new Set([...settings.hiddenProductIds, id])];
    await saveProductSettings(settings);
  } catch {
    return NextResponse.json({ error: "Could not remove product from release schedule" }, { status: 500 });
  }
  const { error } = await getSupabaseAdmin().from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

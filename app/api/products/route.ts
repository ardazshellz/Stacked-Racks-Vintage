import { NextResponse } from "next/server";
import type { Product } from "@/lib/products";
import { productToRow, rowToProduct, type ProductRow } from "@/lib/product-db";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase";

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
    return NextResponse.json({ products: (data as ProductRow[]).map(rowToProduct) });
  } catch (error) {
    console.error("Products fetch failed:", error);
    return NextResponse.json({ products: [], databaseReady: false });
  }
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
  const body = (await req.json()) as { id?: string; product?: unknown };
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
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing product id" }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

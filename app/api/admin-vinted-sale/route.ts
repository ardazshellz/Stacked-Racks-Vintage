import { NextResponse } from "next/server";
import { productToRow, rowToProduct, type ProductRow } from "@/lib/product-db";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { sameOrigin } from "@/lib/server/request-security";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });

  const body = (await req.json()) as {
    productId?: string;
    purchasePrice?: number;
    soldPrice?: number;
  };
  const productId = String(body.productId ?? "").trim();
  const purchasePrice = Number(body.purchasePrice);
  const soldPrice = Number(body.soldPrice);
  if (!productId || !Number.isFinite(purchasePrice) || purchasePrice < 0 || !Number.isFinite(soldPrice) || soldPrice <= 0) {
    return NextResponse.json({ error: "Product, purchase price and sold price are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: existingSale, error: existingSaleError } = await supabase
    .from("orders")
    .select("id")
    .eq("source", "vinted")
    .eq("item_id", productId)
    .limit(1)
    .maybeSingle();
  if (existingSaleError) return NextResponse.json({ error: existingSaleError.message }, { status: 500 });
  if (existingSale) return NextResponse.json({ error: "This item is already recorded as sold on Vinted" }, { status: 409 });

  const { data: productRow, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();
  if (productError || !productRow) {
    return NextResponse.json({ error: productError?.message ?? "Product not found" }, { status: 404 });
  }

  const originalRow = productRow as ProductRow;
  if (originalRow.reserved_until && new Date(originalRow.reserved_until).getTime() > Date.now()) {
    return NextResponse.json({ error: "This item is currently reserved in a website checkout. Try again when the reservation expires." }, { status: 409 });
  }

  const originalProduct = rowToProduct(originalRow);
  const { id: _id, ...productDetails } = originalProduct;
  void _id;
  const soldProduct = { ...productDetails, costPrice: purchasePrice, stock: 0 };
  const { error: stockError } = await supabase
    .from("products")
    .update({
      ...productToRow(soldProduct),
      reserved_until: null,
      reservation_token: null,
    })
    .eq("id", productId);
  if (stockError) return NextResponse.json({ error: stockError.message }, { status: 500 });

  const orderId = `VINTED-${Date.now().toString(36).toUpperCase()}`;
  const orderRow = {
    id: orderId,
    source: "vinted",
    item_id: productId,
    item_name: originalProduct.name,
    brand: originalProduct.brand,
    price: soldPrice,
    postage: 0,
    total: soldPrice,
    customer_name: "Vinted buyer",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
    payment_status: "paid",
    fulfilment_status: "paid",
    notes: "Sold on Vinted",
    items: [{
      id: productId,
      name: originalProduct.name,
      brand: originalProduct.brand,
      price: soldPrice,
      costPrice: purchasePrice,
    }],
    date_of_sale: new Date().toISOString(),
  };
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert(orderRow)
    .select("*")
    .single();

  if (orderError) {
    await supabase.from("products").update({
      ...productToRow(productDetails),
      reserved_until: originalRow.reserved_until ?? null,
      reservation_token: originalRow.reservation_token ?? null,
    }).eq("id", productId);
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  await supabase.from("admin_audit_log").insert({
    action: "product.sold_on_vinted",
    target_type: "product",
    target_id: productId,
    details: { order_id: orderId, purchase_price: purchasePrice, sold_price: soldPrice },
  });

  return NextResponse.json({ order, product: { ...originalProduct, ...soldProduct, id: productId } }, { status: 201 });
}

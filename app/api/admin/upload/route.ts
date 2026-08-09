import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { sameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const data = await req.formData();
  const file = data.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image to upload" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Use a JPG, PNG, WEBP or HEIC image under 4MB" }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: publicData } = supabase.storage.from("product-images").getPublicUrl(path);
  return NextResponse.json({ url: publicData.publicUrl });
}

export async function DELETE(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const { url } = (await req.json()) as { url?: string };
  const marker = "/storage/v1/object/public/product-images/";
  if (!url?.includes(marker)) return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  const path = decodeURIComponent(url.split(marker)[1] ?? "");
  if (!path || path.includes("..")) return NextResponse.json({ error: "Invalid image path" }, { status: 400 });
  const { error } = await getSupabaseAdmin().storage.from("product-images").remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

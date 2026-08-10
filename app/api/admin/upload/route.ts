import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { sameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_BYTES = 50 * 1024 * 1024;
const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 1600;

function storagePath(url?: string) {
  const marker = "/storage/v1/object/public/product-images/";
  if (!url?.includes(marker)) return null;
  const path = decodeURIComponent(url.split(marker)[1] ?? "");
  return path && !path.includes("..") ? path : null;
}

function publicUrl(path: string) {
  return getSupabaseAdmin().storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

function safeIncomingPath(path?: string) {
  return typeof path === "string" && path.startsWith("incoming/") && !path.includes("..") && !path.includes("\\") ? path : null;
}

async function normalizeAndPublish(incomingPath: string) {
  const supabase = getSupabaseAdmin();
  const bucket = supabase.storage.from("product-images");
  const { data, error: downloadError } = await bucket.download(incomingPath);
  if (downloadError || !data) throw new Error(downloadError?.message ?? "Could not load the uploaded photo");

  try {
    const normalized = await sharp(Buffer.from(await data.arrayBuffer()), { failOn: "none" })
      .rotate()
      .resize({ width: 1800, height: 2400, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
    const finalPath = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.jpg`;
    const { error: uploadError } = await bucket.upload(finalPath, normalized, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message);
    return publicUrl(finalPath);
  } finally {
    await bucket.remove([incomingPath]);
  }
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });

  if (req.headers.get("content-type")?.includes("application/json")) {
    const body = (await req.json()) as { phase?: string; fileName?: string; fileType?: string; fileSize?: number; path?: string };
    if (body.phase === "prepare") {
      if (!body.fileType || !ALLOWED_TYPES.has(body.fileType) || !body.fileSize || body.fileSize > MAX_BYTES) {
        return NextResponse.json({ error: "Use a JPG, PNG, WEBP or HEIC image under 50MB" }, { status: 400 });
      }
      const extension = body.fileName?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "image";
      const path = `incoming/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
      const { data, error } = await getSupabaseAdmin().storage.from("product-images").createSignedUploadUrl(path);
      if (error || !data) return NextResponse.json({ error: error?.message ?? "Could not prepare photo upload" }, { status: 500 });
      return NextResponse.json({ path, signedUrl: data.signedUrl });
    }
    if (body.phase === "process") {
      const incomingPath = safeIncomingPath(body.path);
      if (!incomingPath) return NextResponse.json({ error: "Invalid uploaded photo" }, { status: 400 });
      try {
        return NextResponse.json({ url: await normalizeAndPublish(incomingPath) });
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Could not prepare photo" }, { status: 500 });
      }
    }
    return NextResponse.json({ error: "Invalid upload step" }, { status: 400 });
  }

  const data = await req.formData();
  const file = data.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image to upload" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Use a JPG, PNG, WEBP or HEIC image under 50MB" }, { status: 400 });
  }

  let normalized: Buffer;
  try {
    normalized = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "none" })
      .rotate()
      .resize({ width: 1800, height: 2400, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "This photo could not be read. On iPhone, choose Most Compatible or export it as JPG." }, { status: 400 });
  }

  const path = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.jpg`;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from("product-images").upload(path, normalized, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: publicUrl(path) });
}

export async function PUT(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const { url, rotation = 0, zoom = 1, offsetX = 0, offsetY = 0 } = (await req.json()) as {
    url?: string;
    rotation?: number;
    zoom?: number;
    offsetX?: number;
    offsetY?: number;
  };
  const oldPath = storagePath(url);
  if (!oldPath) return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error: downloadError } = await supabase.storage.from("product-images").download(oldPath);
  if (downloadError || !data) return NextResponse.json({ error: downloadError?.message ?? "Could not load image" }, { status: 500 });

  try {
    const safeRotation = [0, 90, 180, 270].includes(rotation) ? rotation : 0;
    const safeZoom = Math.min(3, Math.max(1, Number(zoom) || 1));
    const rotated = await sharp(Buffer.from(await data.arrayBuffer())).rotate(safeRotation).toBuffer();
    const metadata = await sharp(rotated).metadata();
    if (!metadata.width || !metadata.height) throw new Error("Image size unavailable");

    const coverScale = Math.max(OUTPUT_WIDTH / metadata.width, OUTPUT_HEIGHT / metadata.height);
    const width = Math.max(OUTPUT_WIDTH, Math.round(metadata.width * coverScale * safeZoom));
    const height = Math.max(OUTPUT_HEIGHT, Math.round(metadata.height * coverScale * safeZoom));
    const maxLeft = width - OUTPUT_WIDTH;
    const maxTop = height - OUTPUT_HEIGHT;
    const x = Math.min(100, Math.max(-100, Number(offsetX) || 0));
    const y = Math.min(100, Math.max(-100, Number(offsetY) || 0));
    const left = Math.round((maxLeft / 2) * (1 - x / 100));
    const top = Math.round((maxTop / 2) * (1 - y / 100));
    const edited = await sharp(rotated)
      .resize(width, height)
      .extract({ left, top, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT })
      .jpeg({ quality: 91, mozjpeg: true })
      .toBuffer();

    const newPath = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(newPath, edited, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message);
    await supabase.storage.from("product-images").remove([oldPath]);
    return NextResponse.json({ url: publicUrl(newPath) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not edit image" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  const { url } = (await req.json()) as { url?: string };
  const path = storagePath(url);
  if (!path) return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  const { error } = await getSupabaseAdmin().storage.from("product-images").remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

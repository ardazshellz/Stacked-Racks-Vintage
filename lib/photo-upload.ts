// Shrinks large phone photos in the browser before upload (Vercel limits request bodies), and refuses blank results.
export const SAFE_UPLOAD_BYTES = 3.5 * 1024 * 1024;

function assertCanvasHasVisiblePhoto(canvas: HTMLCanvasElement) {
  const sample = document.createElement("canvas");
  sample.width = 32;
  sample.height = 32;
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser could not verify the photo");
  context.drawImage(canvas, 0, 0, sample.width, sample.height);
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
  let brightest = 0;
  let darkest = 255;
  for (let index = 0; index < pixels.length; index += 4) {
    const brightness = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
    brightest = Math.max(brightest, brightness);
    darkest = Math.min(darkest, brightness);
  }
  if (brightest < 8 || darkest > 247 || brightest - darkest < 3) {
    throw new Error("The prepared photo was blank. Please use the original JPG; it has not been uploaded.");
  }
}

export async function optimisePhotoForUpload(file: File) {
  if (file.size <= SAFE_UPLOAD_BYTES && file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, 1800 / bitmap.width, 2400 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the photo");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    assertCanvasHasVisiblePhoto(canvas);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("This photo could not be prepared")), "image/jpeg", 0.84);
    });
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

// Prepares and uploads one admin photo (screenshots of buys and sales), returning its storage URL.
export async function uploadAdminPhoto(file: File) {
  const prepared = await optimisePhotoForUpload(file);
  if (prepared.size > SAFE_UPLOAD_BYTES) throw new Error("Photo is still too large after preparing. Crop it and try again.");
  const body = new FormData();
  body.append("file", prepared);
  const response = await fetch("/api/admin/upload", { method: "POST", body });
  const uploaded = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(uploaded.error ?? "Photo upload failed");
  return String(uploaded.url);
}

// Refreshes the homepage rail cut-outs (macOS only: uses Vision through scripts/cutout.swift).
// Run after new stock goes live:  node scripts/rail-cutouts.ts
// Reads the live catalogue, cuts each rail pick's front photo (and back photo, if chosen) out of
// its background, writes public/rail/<id>.webp and <id>-back.webp, and updates lib/rail-cutouts.json.
// Back photos are not always in the same position, so new pieces start with "back": null.
// To give one a "See back" button, set "back" to the photo's position (first photo = 0) and run again.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { railPicks, type Product } from "../lib/products.ts";

const SITE = process.env.SITE_URL ?? "https://stackedracksvintage.co.uk";
const OUT = "public/rail";
const LIST = "lib/rail-cutouts.json";
const LIMIT = 20;

const previous: Record<string, { back: number | null }> = JSON.parse(readFileSync(LIST, "utf8"));
const data = await (await fetch(`${SITE}/api/products`)).json();
const unavailable = new Set([...(data.hiddenProductIds ?? []), ...(data.deletedProductIds ?? [])]);
const picks = railPicks((data.products as Product[]).filter((p) => !unavailable.has(p.id)), LIMIT);

const tmp = mkdtempSync(join(tmpdir(), "rail-"));
const tool = join(tmp, "cutout");
execFileSync("swiftc", ["-O", "scripts/cutout.swift", "-o", tool]);

async function cut(url: string, file: string) {
  if (existsSync(file)) return true;
  const jpg = join(tmp, "in.jpg");
  const png = join(tmp, "out.png");
  writeFileSync(jpg, Buffer.from(await (await fetch(url)).arrayBuffer()));
  try {
    execFileSync(tool, [jpg, png]);
  } catch {
    return false;
  }
  await sharp(png).resize({ height: 900, withoutEnlargement: true }).webp({ quality: 82 }).toFile(file);
  return true;
}

const list: typeof previous = {};
for (const product of picks) {
  const id = String(product.id);
  if (!(await cut(product.imageUrls![0], join(OUT, `${id}.webp`)))) {
    console.warn(`skipped (no garment found): ${product.name}`);
    continue;
  }
  let back = previous[id]?.back ?? null;
  const backUrl = back === null ? undefined : product.imageUrls![back];
  if (!backUrl || !(await cut(backUrl, join(OUT, `${id}-back.webp`)))) back = null;
  if (back === null) console.log(`no back photo set: ${product.name} (${id})`);
  list[id] = { back };
}

for (const name of readdirSync(OUT)) {
  const id = name.replace(/(-back)?\.webp$/, "");
  if (!list[id] || (name.includes("-back") && list[id].back === null)) rmSync(join(OUT, name));
}
writeFileSync(LIST, JSON.stringify(list, null, 2) + "\n");
rmSync(tmp, { recursive: true });
console.log(`${Object.keys(list).length} pieces on the rail`);

// Refreshes the homepage rail cut-outs (macOS only: uses Vision through scripts/cutout.swift).
// Run after new stock goes live:  node scripts/rail-cutouts.ts
// Reads the live catalogue, cuts the first photo of each rail pick out of its background,
// writes public/rail/<id>.webp and lib/rail-cutouts.json, and removes cut-outs no longer on the rail.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { railPicks, type Product } from "../lib/products.ts";

const SITE = process.env.SITE_URL ?? "https://stackedracksvintage.co.uk";
const OUT = "public/rail";
const LIMIT = 20;

const data = await (await fetch(`${SITE}/api/products`)).json();
const unavailable = new Set([...(data.hiddenProductIds ?? []), ...(data.deletedProductIds ?? [])]);
const picks = railPicks((data.products as Product[]).filter((p) => !unavailable.has(p.id)), LIMIT);

const tmp = mkdtempSync(join(tmpdir(), "rail-"));
const tool = join(tmp, "cutout");
execFileSync("swiftc", ["-O", "scripts/cutout.swift", "-o", tool]);

const ids: string[] = [];
for (const product of picks) {
  const file = join(OUT, `${product.id}.webp`);
  if (!existsSync(file)) {
    const jpg = join(tmp, "in.jpg");
    const png = join(tmp, "out.png");
    writeFileSync(jpg, Buffer.from(await (await fetch(product.imageUrls![0])).arrayBuffer()));
    try {
      execFileSync(tool, [jpg, png]);
    } catch {
      console.warn(`skipped (no garment found): ${product.name}`);
      continue;
    }
    await sharp(png).resize({ height: 900, withoutEnlargement: true }).webp({ quality: 82 }).toFile(file);
    console.log(`cut: ${product.name}`);
  }
  ids.push(String(product.id));
}

for (const name of readdirSync(OUT)) {
  if (!ids.includes(name.replace(/\.webp$/, ""))) rmSync(join(OUT, name));
}
writeFileSync("lib/rail-cutouts.json", JSON.stringify(ids, null, 2) + "\n");
rmSync(tmp, { recursive: true });
console.log(`${ids.length} pieces on the rail`);

import type { Product } from "./products";

export function productSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "vintage-item";
}

export function productPath(product: Pick<Product, "id" | "name">) {
  return `/products/${encodeURIComponent(String(product.id))}/${productSlug(product.name)}`;
}

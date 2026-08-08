import type { Product } from "./products";

export interface ProductRow {
  id: string;
  name: string;
  brand: string;
  size: string;
  gender: Product["gender"];
  price: number | string;
  category: string;
  badge: Product["badge"];
  rare_badge: Product["rareBadge"] | null;
  stock: number;
  condition: Product["condition"];
  era: Product["era"];
  fit: Product["fit"];
  listed_date: string;
  description: string;
  editorial_story: string | null;
  image_urls: string[] | null;
  vinted_title: string | null;
  vinted_description: string | null;
}

export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    size: row.size,
    gender: row.gender,
    price: Number(row.price),
    category: row.category,
    badge: row.badge,
    rareBadge: row.rare_badge ?? undefined,
    stock: row.stock,
    condition: row.condition,
    era: row.era,
    fit: row.fit,
    listedDate: row.listed_date,
    description: row.description,
    editorialStory: row.editorial_story ?? undefined,
    imageUrls: row.image_urls ?? [],
    vintedTitle: row.vinted_title ?? undefined,
    vintedDescription: row.vinted_description ?? undefined,
  };
}

export function productToRow(product: Omit<Product, "id">) {
  return {
    name: product.name.trim(),
    brand: product.brand.trim(),
    size: product.size,
    gender: product.gender,
    price: product.price,
    category: product.category,
    badge: product.badge,
    rare_badge: product.rareBadge ?? null,
    stock: product.stock,
    condition: product.condition,
    era: product.era,
    fit: product.fit,
    listed_date: product.listedDate,
    description: product.description.trim(),
    editorial_story: product.editorialStory?.trim() || null,
    image_urls: product.imageUrls ?? [],
    vinted_title: product.vintedTitle?.trim() || null,
    vinted_description: product.vintedDescription?.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

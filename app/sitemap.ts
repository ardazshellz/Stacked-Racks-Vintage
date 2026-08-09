import type { MetadataRoute } from "next";
import { getPublicProducts } from "@/lib/server/catalog";
import { productPath } from "@/lib/product-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stackedracksvintage.co.uk";
  const routes = ["", "/shop", "/contact", "/legal", "/legal/privacy", "/legal/terms"];

  const pages: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" || route === "/shop" ? "daily" : "monthly",
    priority: route === "" ? 1 : route === "/shop" ? 0.9 : 0.5,
  }));
  const products = await getPublicProducts().catch((error) => {
    console.error("Sitemap catalogue load failed:", error);
    return [];
  });
  return [...pages, ...products.map((product) => ({ url: `${baseUrl}${productPath(product)}`, lastModified: new Date(`${product.listedDate}T00:00:00`), changeFrequency: "weekly" as const, priority: 0.8 }))];
}

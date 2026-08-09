"use client";

import { useState, useEffect } from "react";
import type { Product } from "@/lib/products";

export function useProducts(): Product[] {
  const [databaseProducts, setDatabaseProducts] = useState<Product[]>([]);
  const [hiddenProductIds, setHiddenProductIds] = useState<string[]>([]);
  const [deletedProductIds, setDeletedProductIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        const data = await response.json();
        if (active && response.ok) {
          setDatabaseProducts(data.products ?? []);
          setHiddenProductIds(data.hiddenProductIds ?? []);
          setDeletedProductIds(data.deletedProductIds ?? []);
        }
      } catch {
        if (active) setDatabaseProducts([]);
      }
    };
    void refresh();
    window.addEventListener("sr:products-updated", refresh);
    return () => {
      active = false;
      window.removeEventListener("sr:products-updated", refresh);
    };
  }, []);

  const seen = new Set<string>();
  const unavailable = new Set([...hiddenProductIds, ...deletedProductIds]);
  return databaseProducts.filter((product) => {
    const id = String(product.id);
    if (unavailable.has(id)) return false;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

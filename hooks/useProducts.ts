"use client";

import { useState, useEffect } from "react";
import { products as staticProducts, Product } from "@/lib/products";
import { getDynamicProducts } from "@/lib/dynamicProducts";

export function useProducts(): Product[] {
  const [databaseProducts, setDatabaseProducts] = useState<Product[]>([]);
  const [legacyProducts, setLegacyProducts] = useState<Product[]>([]);
  const [hiddenProductIds, setHiddenProductIds] = useState<string[]>([]);
  const [deletedProductIds, setDeletedProductIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      setLegacyProducts(getDynamicProducts());
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
  return [...databaseProducts, ...legacyProducts, ...staticProducts].filter((product) => {
    const id = String(product.id);
    if (unavailable.has(id)) return false;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

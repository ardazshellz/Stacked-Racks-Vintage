"use client";

import { useState, useEffect } from "react";
import { products as staticProducts, Product } from "@/lib/products";
import { getDynamicProducts } from "@/lib/dynamicProducts";

export function useProducts(): Product[] {
  const [dynamic, setDynamic] = useState<Product[]>([]);

  useEffect(() => {
    setDynamic(getDynamicProducts());
    const refresh = () => setDynamic(getDynamicProducts());
    window.addEventListener("sr:products-updated", refresh);
    return () => window.removeEventListener("sr:products-updated", refresh);
  }, []);

  return [...dynamic, ...staticProducts];
}

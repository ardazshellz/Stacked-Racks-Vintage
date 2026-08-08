import { Product } from "./products";

const KEY = "sr_dynamic_products";

export function getDynamicProducts(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveDynamicProducts(list: Product[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("sr:products-updated"));
}

export function addDynamicProduct(data: Omit<Product, "id">): Product {
  const p: Product = { ...data, id: Date.now() };
  saveDynamicProducts([p, ...getDynamicProducts()]);
  return p;
}

export function updateDynamicProduct(updated: Product): void {
  saveDynamicProducts(getDynamicProducts().map((p) => (p.id === updated.id ? updated : p)));
}

export function deleteDynamicProduct(id: number): void {
  saveDynamicProducts(getDynamicProducts().filter((p) => p.id !== id));
}

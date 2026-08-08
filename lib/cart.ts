const CART_KEY = "stacked-racks-cart";
export const CART_UPDATED_EVENT = "sr:cart-updated";
export const MAX_CART_ITEMS = 8;

export function getCartIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))].slice(0, MAX_CART_ITEMS);
  } catch {
    return [];
  }
}

function saveCart(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}

export function addCartItem(id: string | number): "added" | "exists" | "full" {
  const itemId = String(id);
  const ids = getCartIds();
  if (ids.includes(itemId)) return "exists";
  if (ids.length >= MAX_CART_ITEMS) return "full";
  saveCart([...ids, itemId]);
  return "added";
}

export function removeCartItem(id: string | number) {
  saveCart(getCartIds().filter((itemId) => itemId !== String(id)));
}

export function clearCart() {
  saveCart([]);
}

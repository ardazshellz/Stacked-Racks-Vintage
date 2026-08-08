"use client";

import { useState, useSyncExternalStore } from "react";
import { addCartItem, CART_UPDATED_EVENT, getCartIds } from "@/lib/cart";
import type { Product } from "@/lib/products";

function subscribeToCart(onStoreChange: () => void) {
  window.addEventListener(CART_UPDATED_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export default function AddToCartButton({ product, className = "" }: { product: Product; className?: string }) {
  const cartSnapshot = useSyncExternalStore(
    subscribeToCart,
    () => getCartIds().join("|"),
    () => "",
  );
  const isInCart = cartSnapshot.split("|").includes(String(product.id));
  const [cartFull, setCartFull] = useState(false);

  const add = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const result = addCartItem(product.id);
    setCartFull(result === "full");
  };

  return (
    <button
      type="button"
      onClick={add}
      disabled={product.stock < 1 || isInCart}
      className={className}
      aria-live="polite"
    >
      {isInCart ? "ALREADY IN CART" : cartFull ? "CART FULL" : "ADD TO CART"}
    </button>
  );
}

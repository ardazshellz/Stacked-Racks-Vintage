"use client";

import { useState, useSyncExternalStore } from "react";
import { addCartItem, CART_UPDATED_EVENT, getCartIds, removeCartItem } from "@/lib/cart";
import type { Product } from "@/lib/products";
import { trackEvent } from "@/lib/analytics";
import { trackFirstParty } from "@/lib/first-party-analytics";
import { trackMetaEvent } from "@/lib/meta-pixel";

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

  const toggleCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setCartFull(false);
    if (isInCart) {
      removeCartItem(product.id);
      trackEvent("remove_from_cart", {
        item_id: String(product.id),
        item_name: product.name,
        value: product.price,
        currency: "GBP",
      });
      return;
    }
    const result = addCartItem(product.id);
    setCartFull(result === "full");
    if (result !== "full") {
      trackFirstParty("add_to_cart", { productId: String(product.id), productName: product.name });
      trackEvent("add_to_cart", {
        item_id: String(product.id),
        item_name: product.name,
        value: product.price,
        currency: "GBP",
      });
      trackMetaEvent("AddToCart", {
        content_ids: [String(product.id)],
        content_name: product.name,
        content_type: "product",
        value: product.price,
        currency: "GBP",
      });
    }
  };

  return (
    <button
      type="button"
      onClick={toggleCart}
      disabled={product.stock < 1}
      className={className}
      aria-live="polite"
      aria-pressed={isInCart}
      aria-label={isInCart ? `Remove ${product.name} from cart` : `Add ${product.name} to cart`}
    >
      {isInCart ? "ALREADY ADDED TO CART" : cartFull ? "CART FULL" : "ADD TO CART"}
    </button>
  );
}

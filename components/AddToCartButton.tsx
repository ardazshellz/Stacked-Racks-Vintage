"use client";

import { useState } from "react";
import { addCartItem } from "@/lib/cart";
import type { Product } from "@/lib/products";

export default function AddToCartButton({ product, className = "" }: { product: Product; className?: string }) {
  const [message, setMessage] = useState("ADD TO CART");

  const add = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const result = addCartItem(product.id);
    setMessage(result === "full" ? "CART FULL" : result === "exists" ? "ALREADY IN CART" : "ADDED TO CART ✓");
    window.setTimeout(() => setMessage("ADD TO CART"), 1800);
  };

  return (
    <button
      type="button"
      onClick={add}
      disabled={product.stock < 1}
      className={className}
    >
      {message}
    </button>
  );
}

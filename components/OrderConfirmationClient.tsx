"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/cart";
import { trackEvent } from "@/lib/analytics";

export default function OrderConfirmationClient({ orderId, total, itemCount }: { orderId: string; total: number; itemCount: number }) {
  useEffect(() => {
    clearCart();
    trackEvent("purchase", {
      transaction_id: orderId,
      value: total,
      currency: "GBP",
      items: itemCount,
    });
  }, [itemCount, orderId, total]);
  return null;
}

"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/cart";
import { trackEvent } from "@/lib/analytics";
import { trackMetaEvent } from "@/lib/meta-pixel";

export default function OrderConfirmationClient({ orderId, total, itemCount }: { orderId: string; total: number; itemCount: number }) {
  useEffect(() => {
    clearCart();
    trackEvent("purchase", {
      transaction_id: orderId,
      value: total,
      currency: "GBP",
      items: itemCount,
    });
    trackMetaEvent("Purchase", {
      value: total,
      currency: "GBP",
      num_items: itemCount,
    }, `purchase_${orderId}`);
  }, [itemCount, orderId, total]);
  return null;
}

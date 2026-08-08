"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CART_UPDATED_EVENT, getCartIds } from "@/lib/cart";

export default function CartLink({ mobile = false }: { mobile?: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(getCartIds().length);
    refresh();
    window.addEventListener(CART_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <Link
      href="/checkout?cart=true"
      className={mobile
        ? "flex items-center justify-between px-6 py-4 text-sm font-bold text-white uppercase tracking-widest border-b border-white/5"
        : "flex items-center gap-2 px-3 py-1.5 text-xs font-bold tracking-wider uppercase text-white/70 hover:text-[#E8500A] transition-colors"}
      aria-label={`Shopping cart with ${count} item${count === 1 ? "" : "s"}`}
    >
      <span>Cart</span>
      <span className="min-w-5 h-5 px-1 rounded-full bg-[#E8500A] text-white text-[10px] flex items-center justify-center">{count}</span>
    </Link>
  );
}

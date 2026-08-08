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
        : "flex shrink-0 items-center gap-1.5 px-1.5 sm:px-3 py-1.5 text-xs font-bold tracking-wider uppercase text-white/70 hover:text-[#E8500A] transition-colors"}
      aria-label={`Shopping cart with ${count} item${count === 1 ? "" : "s"}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-4 h-4 ${mobile ? "hidden" : "shrink-0"}`} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437m0 0L6.75 11.25A2.25 2.25 0 009 12.9h7.5a2.25 2.25 0 002.25-1.65l1.125-4.125H5.106zM9 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm9 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
      <span className={mobile ? "" : "hidden sm:inline"}>Cart</span>
      <span className="min-w-5 h-5 px-1 rounded-full bg-[#E8500A] text-white text-[10px] flex items-center justify-center">{count}</span>
    </Link>
  );
}

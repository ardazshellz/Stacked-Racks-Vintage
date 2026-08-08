"use client";

import { usePathname } from "next/navigation";
import SalesTicker from "./SalesTicker";
import FloatingButtons from "./FloatingButtons";
import CookieConsent from "./CookieConsent";

export default function ClientShell() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <>
      <SalesTicker />
      <FloatingButtons />
      <CookieConsent />
    </>
  );
}

"use client";

import { usePathname } from "next/navigation";
import SalesTicker from "./SalesTicker";
import FloatingButtons from "./FloatingButtons";
import CookieConsent from "./CookieConsent";
import EmailPopup from "./EmailPopup";
import SiteAnalytics from "./SiteAnalytics";

export default function ClientShell() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <>
      <SalesTicker />
      <EmailPopup />
      {!pathname.startsWith("/checkout") && <FloatingButtons />}
      <CookieConsent />
      <SiteAnalytics />
    </>
  );
}

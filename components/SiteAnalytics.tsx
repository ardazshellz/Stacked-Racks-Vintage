"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackFirstParty } from "@/lib/first-party-analytics";

export default function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    trackFirstParty("page_view", { path: `${pathname}${window.location.search}` });
  }, [pathname]);

  return null;
}

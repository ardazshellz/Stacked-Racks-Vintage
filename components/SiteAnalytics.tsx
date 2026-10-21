"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackFirstParty } from "@/lib/first-party-analytics";

export default function SiteAnalytics() {
  const pathname = usePathname();

  // Parcel card QR (?from=parcel): count the scan once, then drop the tag so a reload is not counted again.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("from") !== "parcel") return;
    void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "parcel_visit" }), keepalive: true });
    url.searchParams.delete("from");
    window.history.replaceState(window.history.state, "", url);
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    trackFirstParty("page_view", { path: `${pathname}${window.location.search}` });
  }, [pathname]);

  return null;
}

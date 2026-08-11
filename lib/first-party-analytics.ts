"use client";

type EventName = "page_view" | "product_view" | "product_click" | "add_to_cart" | "checkout_started";

function randomId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function identifier(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const value = randomId();
  storage.setItem(key, value);
  return value;
}

export function trackFirstParty(event: EventName, details: { productId?: string; productName?: string; path?: string } = {}) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("sr_cookie_consent") !== "accepted") return;
  if (document.cookie.includes("sr_analytics_exclude=1")) return;

  const payload = JSON.stringify({
    event,
    visitorId: identifier(window.localStorage, "sr_visitor_id"),
    sessionId: identifier(window.sessionStorage, "sr_session_id"),
    path: details.path ?? `${window.location.pathname}${window.location.search}`,
    productId: details.productId,
    productName: details.productName,
    referrer: document.referrer,
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }));
    return;
  }
  void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
}

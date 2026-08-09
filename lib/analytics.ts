type AnalyticsValue = string | number | boolean | undefined;

declare global {
  interface Window {
    gtag?: (command: "event", name: string, params?: Record<string, AnalyticsValue>) => void;
  }
}

export function trackEvent(name: string, params: Record<string, AnalyticsValue> = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}

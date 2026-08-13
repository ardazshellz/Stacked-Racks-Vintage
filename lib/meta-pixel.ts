"use client";

const CONSENT_KEY = "sr_cookie_consent";
const META_SCRIPT_ID = "sr-meta-pixel";

type MetaValue = string | number | boolean | string[] | number[] | undefined;
type MetaParams = Record<string, MetaValue>;
type MetaEvent = { name: string; params: MetaParams; dedupeKey?: string };

declare global {
  interface Window {
    fbq?: ((command: string, ...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[][];
      loaded?: boolean;
      version?: string;
      push?: Window["fbq"];
    };
    _fbq?: Window["fbq"];
  }
}

const pendingEvents: MetaEvent[] = [];
let initialisedPixelId = "";

function hasConsent() {
  return typeof window !== "undefined" && window.localStorage.getItem(CONSENT_KEY) === "accepted";
}

function sendEvent(event: MetaEvent) {
  if (!hasConsent() || !window.fbq) return false;
  const storageKey = event.dedupeKey ? `sr_meta_event_${event.dedupeKey}` : "";
  if (storageKey && window.localStorage.getItem(storageKey) === "sent") return true;
  window.fbq("track", event.name, event.params);
  if (storageKey) window.localStorage.setItem(storageKey, "sent");
  return true;
}

function flushPendingEvents() {
  if (!hasConsent() || !window.fbq) return;
  pendingEvents.splice(0).forEach((event) => sendEvent(event));
}

export function initialiseMetaPixel(pixelId: string) {
  if (!pixelId || !hasConsent()) return;

  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue?.push(args);
    } as NonNullable<Window["fbq"]>;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
  }

  if (!document.getElementById(META_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = META_SCRIPT_ID;
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq("consent", "grant");
  if (initialisedPixelId !== pixelId) {
    window.fbq("init", pixelId);
    initialisedPixelId = pixelId;
  }
}

export function trackMetaEvent(name: string, params: MetaParams = {}, dedupeKey?: string) {
  if (typeof window === "undefined") return;
  const consent = window.localStorage.getItem(CONSENT_KEY);
  if (consent === "declined") return;
  const event = { name, params, dedupeKey };
  if (sendEvent(event)) flushPendingEvents();
  else pendingEvents.push(event);
}

export function revokeMetaConsent() {
  pendingEvents.length = 0;
  window.fbq?.("consent", "revoke");
}

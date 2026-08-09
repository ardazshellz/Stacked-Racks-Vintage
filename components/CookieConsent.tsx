"use client";

import { useState, useEffect } from "react";
import Script from "next/script";

const KEY = "sr_cookie_consent";

export default function CookieConsent() {
  const [consent, setConsent] = useState<"accepted" | "declined" | null>(null);
  const [ready, setReady] = useState(false);
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  useEffect(() => {
    const showSettings = () => {
      if (window.location.hash === "#cookie-settings") {
        localStorage.removeItem(KEY);
        setConsent(null);
        setReady(true);
      }
    };
    const frame = window.requestAnimationFrame(() => {
      const stored = localStorage.getItem(KEY);
      if (window.location.hash === "#cookie-settings") setConsent(null);
      else if (stored === "accepted" || stored === "declined") setConsent(stored);
      setReady(true);
    });
    window.addEventListener("hashchange", showSettings);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("hashchange", showSettings); };
  }, []);

  const accept = () => {
    localStorage.setItem(KEY, "accepted");
    setConsent("accepted");
  };

  const decline = () => {
    localStorage.setItem(KEY, "declined");
    setConsent("declined");
  };

  const analytics = consent === "accepted" && gaId ? (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('consent', 'default', { analytics_storage: 'granted' });
        gtag('config', '${gaId}', { anonymize_ip: true });
      `}</Script>
    </>
  ) : null;

  if (!ready || consent) return analytics;

  return (
    <>
      {analytics}
      <div className="fixed bottom-0 left-0 right-0 z-[200] bg-[#111] border-t border-white/10 px-4 py-4 sm:py-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-white text-xs font-bold mb-1">This site uses cookies</p>
            <p className="text-[#aaa] text-[11px] leading-relaxed">
              We use optional Google Analytics cookies to understand how the site is used. Stripe may use essential cookies when you choose to pay. Read our{" "}
              <a href="/legal/privacy" className="text-[#E8500A] hover:underline">Privacy Policy</a>.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={decline}
              className="text-[10px] font-black tracking-[0.15em] uppercase px-5 py-2.5 border border-white/25 text-[#aaa] hover:border-white/40 hover:text-white transition-colors"
            >
              Decline
            </button>
            <button
              onClick={accept}
              className="text-[10px] font-black tracking-[0.15em] uppercase px-5 py-2.5 bg-[#E8500A] text-white hover:bg-[#c94009] transition-colors"
            >
              Accept Analytics
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

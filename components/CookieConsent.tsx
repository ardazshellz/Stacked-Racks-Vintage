"use client";

import { useState, useEffect } from "react";

const KEY = "sr_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] bg-[#111] border-t border-white/10 px-4 py-4 sm:py-5">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-white text-xs font-bold mb-1">This site uses cookies</p>
          <p className="text-[#666] text-[11px] leading-relaxed">
            We use cookies for Google Analytics and Stripe payments. By accepting you consent to these cookies in line with our{" "}
            <a href="/legal/privacy" className="text-[#E8500A] hover:underline">Privacy Policy</a>.
            Declining disables analytics but Stripe still uses essential cookies for payment processing.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="text-[10px] font-black tracking-[0.15em] uppercase px-5 py-2.5 border border-white/15 text-[#666] hover:border-white/30 hover:text-white transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="text-[10px] font-black tracking-[0.15em] uppercase px-5 py-2.5 bg-[#E8500A] text-white hover:bg-[#c94009] transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}

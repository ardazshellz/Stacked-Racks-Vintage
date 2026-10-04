"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

const SUBSCRIBED_KEY = "sr_email_subscribed";
const DISMISSED_KEY = "sr_email_popup_dismissed";
const FADE_DURATION_MS = 300;
const EXCLUDED_ROUTES = ["/admin", "/checkout", "/cart", "/order-confirmation", "/order-status", "/unsubscribe", "/legal"];

export default function EmailPopup() {
  const pathname = usePathname();
  const excluded = EXCLUDED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const closingRef = useRef(false);

  const open = useCallback(() => {
    if (excluded || localStorage.getItem(SUBSCRIBED_KEY)) return;
    closingRef.current = false;
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      setActive(true);
    }
    setVisible(true);
  }, [excluded]);

  const dismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setActive(false);
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      closeTimerRef.current = null;
      setVisible(false);
    } else {
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        setVisible(false);
      }, FADE_DURATION_MS);
    }
  }, []);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  useEffect(() => {
    document.addEventListener("sr:open-email-popup", open);
    return () => document.removeEventListener("sr:open-email-popup", open);
  }, [open]);

  useEffect(() => {
    if (excluded) {
      const timer = window.setTimeout(() => {
        if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
        if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
        closeTimerRef.current = null;
        frameRef.current = null;
        closingRef.current = true;
        setActive(false);
        setVisible(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (localStorage.getItem(SUBSCRIBED_KEY) || sessionStorage.getItem(DISMISSED_KEY)) return;
    const timer = window.setTimeout(() => {
      if (!sessionStorage.getItem(DISMISSED_KEY)) open();
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [excluded, open]);

  useEffect(() => {
    if (!visible || excluded) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        if (!closingRef.current) setActive(true);
      });
    });
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [visible, excluded]);

  useEffect(() => {
    if (!visible || excluded) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      } else if (event.key === "Tab") {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
  }, [visible, excluded, dismiss]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) { setError("Please enter a valid email."); return; }
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not send your code");
      setSubmitted(true);
      localStorage.setItem(SUBSCRIBED_KEY, "1");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not send your code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!visible || excluded) return null;

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-300 motion-reduce:duration-0 ${active ? "opacity-100" : "opacity-0"}`}
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="email-popup-title" className={`bg-[#111] border border-white/10 w-full max-w-sm shadow-2xl relative overflow-hidden transition-[opacity,transform] duration-300 motion-reduce:duration-0 motion-reduce:transition-opacity ${active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 motion-reduce:translate-y-0"}`}>
        {/* Orange top accent */}
        <div className="h-1 bg-[#E8500A]" />

        {/* Close */}
        <button
          ref={closeRef}
          onClick={dismiss}
          className="absolute top-2 right-2 text-[#aaa] hover:text-white w-10 h-10 flex items-center justify-center transition-colors z-10"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-7 pt-6 pb-7">
          {!submitted ? (
            <>
              <p className="text-[#E8500A] text-[9px] font-black tracking-[0.3em] uppercase mb-2">Exclusive Offer</p>
              <h2
                id="email-popup-title"
                className="text-white text-xl font-black tracking-wide mb-1 leading-tight"
                style={{ fontFamily: "var(--font-playfair-display), serif" }}
              >
                10% OFF YOUR FIRST ORDER
              </h2>
              <p className="text-[#aaa] text-xs leading-relaxed mb-5">
                Sign up and we&apos;ll send your discount code straight away. Be first to hear about new drops and archive pieces.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  aria-label="Email address"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  required
                  className="w-full bg-[#1a1a1a] border border-white/10 text-white text-sm px-4 py-3 outline-none focus:border-[#E8500A]/60 transition-colors placeholder:text-[#444]"
                />
                {error && <p className="text-red-400 text-[10px]">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#E8500A] disabled:opacity-50 text-white font-black text-xs tracking-[0.2em] uppercase py-3.5 hover:bg-[#c94009] transition-colors"
                >
                  {loading ? "SENDING…" : "CLAIM 10% OFF"}
                </button>
              </form>

              <p className="text-[#777] text-[11px] text-center mt-3 leading-relaxed">
                No spam. Unsubscribe any time. By signing up you agree to our{" "}
                <a href="/legal/privacy" className="underline hover:text-[#777] transition-colors">privacy policy</a>.
              </p>
            </>
          ) : (
            <>
              <div className="text-center py-2">
                <div className="w-10 h-10 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5 text-emerald-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-[#E8500A] text-[9px] font-black tracking-[0.3em] uppercase mb-2">Check Your Inbox</p>
                <h2
                  id="email-popup-title"
                  className="text-white text-xl font-black tracking-wide mb-3"
                  style={{ fontFamily: "var(--font-playfair-display), serif" }}
                >
                  Your Private Code Is On Its Way
                </h2>

                <div className="text-left bg-[#161616] border border-white/5 p-4 mb-4 space-y-2">
                  <p className="text-white text-[10px] font-bold tracking-wider uppercase">How to use it</p>
                  <ol className="text-[#aaa] text-[10px] leading-relaxed space-y-1 list-decimal list-inside">
                    <li>Find an item you love and add it to your cart</li>
                    <li>Continue to secure checkout</li>
                    <li>Open the email we have just sent you</li>
                    <li>Enter your private code in the discount-code field at checkout</li>
                    <li>10% comes off your total automatically</li>
                  </ol>
                </div>

                <p className="text-[#444] text-[9px] leading-relaxed">
                  The code is only revealed by email, so keep that message safe until you use it.
                </p>
              </div>

              <button
                onClick={dismiss}
                className="w-full mt-5 border border-white/15 text-[#aaa] font-bold text-xs tracking-wider uppercase py-2.5 hover:text-white hover:border-white/30 transition-colors"
              >
                Start Shopping
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

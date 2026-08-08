"use client";

import { useState, useEffect } from "react";

const SUBSCRIBED_KEY = "sr_email_subscribed";
const VOUCHER_CODE = "VINTAGE10";

export default function EmailPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const open = () => {
      // Only suppress if they've already subscribed
      if (!localStorage.getItem(SUBSCRIBED_KEY)) setVisible(true);
    };
    document.addEventListener("sr:open-email-popup", open);
    return () => document.removeEventListener("sr:open-email-popup", open);
  }, []);

  // Just close — no permanent dismissal, so banner click opens it again
  const dismiss = () => setVisible(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) { setError("Please enter a valid email."); return; }
    setError("");
    setLoading(true);
    try {
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch { /* non-fatal */ }
    setLoading(false);
    setSubmitted(true);
    localStorage.setItem(SUBSCRIBED_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div className="bg-[#111] border border-white/10 w-full max-w-sm shadow-2xl relative overflow-hidden">
        {/* Orange top accent */}
        <div className="h-1 bg-[#E8500A]" />

        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-[#555] hover:text-white w-7 h-7 flex items-center justify-center transition-colors z-10"
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
                className="text-white text-xl font-black tracking-wide mb-1 leading-tight"
                style={{ fontFamily: "var(--font-playfair-display), serif" }}
              >
                10% Off Your First Order
              </h2>
              <p className="text-[#aaa] text-xs leading-relaxed mb-5">
                Sign up and we&apos;ll send your discount code straight away. Be first to hear about new drops and archive pieces.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
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

              <p className="text-[#333] text-[9px] text-center mt-3 leading-relaxed">
                No spam. Unsubscribe any time. By signing up you agree to our{" "}
                <a href="/legal" className="underline hover:text-[#555] transition-colors">privacy policy</a>.
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
                <p className="text-[#E8500A] text-[9px] font-black tracking-[0.3em] uppercase mb-2">Your Code</p>
                <h2
                  className="text-white text-xl font-black tracking-wide mb-3"
                  style={{ fontFamily: "var(--font-playfair-display), serif" }}
                >
                  You&apos;re In
                </h2>

                {/* Voucher code box */}
                <div className="bg-[#1a1a1a] border border-[#E8500A]/30 px-5 py-3 mb-4">
                  <p className="text-[#555] text-[9px] tracking-[0.25em] uppercase mb-1">Your discount code</p>
                  <p className="text-[#E8500A] font-black text-2xl tracking-[0.3em]">{VOUCHER_CODE}</p>
                </div>

                <div className="text-left bg-[#161616] border border-white/5 p-4 mb-4 space-y-2">
                  <p className="text-white text-[10px] font-bold tracking-wider uppercase">How to use it</p>
                  <ol className="text-[#aaa] text-[10px] leading-relaxed space-y-1 list-decimal list-inside">
                    <li>Find an item you love and click it</li>
                    <li>Choose <span className="text-white font-medium">&ldquo;Checkout with Card&rdquo;</span></li>
                    <li>Enter <span className="text-[#E8500A] font-black">{VOUCHER_CODE}</span> in the discount code field at checkout</li>
                    <li>10% comes off your total automatically</li>
                  </ol>
                </div>

                <p className="text-[#444] text-[9px] leading-relaxed">
                  Check your inbox — we&apos;ve also emailed it to you so you don&apos;t lose it.
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

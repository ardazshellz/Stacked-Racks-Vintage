import TrustStrip from "./TrustStrip";

export default function Footer() {
  return (
    <>
    <TrustStrip />
    <footer className="bg-[#080808] border-t border-white/8 mt-0">
      {/* Top strip */}
      <div className="bg-[#E8500A]/10 border-b border-[#E8500A]/20 py-3">
        <p className="text-center text-[#E8500A] text-[10px] font-black tracking-[0.3em] uppercase">
          ✦ STACKED RACKS VINTAGE · LONDON, UK ✦
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Logo + tagline */}
        <div className="text-center mb-7">
          <h2
            className="font-black tracking-wider text-2xl"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}
          >
            <span className="text-[#E8500A]">STACKED</span>
            <span className="text-[#F5C300] ml-2">RACKS</span>
            <span className="text-white ml-2">VINTAGE</span>
          </h2>
          <p className="text-[#888] text-[10px] mt-2 tracking-[0.25em] uppercase">
            Vintage & Rare Clothing Since Day One
          </p>
        </div>

        {/* Social links — single row */}
        <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mb-7">
          {[
            { label: "Instagram", href: "https://instagram.com/stacked_racks_vintage" },
            { label: "Vinted",    href: "https://www.vinted.co.uk/member/59714764-stackedracks" },
          ].map(({ label, href }) => (
            <a key={label} href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="text-[#888] text-sm font-bold tracking-widest uppercase hover:text-[#E8500A] transition-colors">
              {label}
            </a>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-7">
          <div className="flex-1 border-t border-white/5" />
          <span className="text-[#E8500A] text-[10px]">✦</span>
          <div className="flex-1 border-t border-white/5" />
        </div>

        {/* Stats — compact single row */}
        <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 mb-7">
          {[
            { stat: "5,000+", label: "Sales" },
            { stat: "2,500+", label: "5★ Reviews" },
            { stat: "2,469",  label: "Followers" },
            { stat: "Ltd Co.", label: "London" },
          ].map(({ stat, label }, i, arr) => (
            <span key={stat} className="flex items-center gap-3">
              <span className="text-white font-black text-sm">{stat} <span className="text-[#444] font-normal text-[10px] tracking-widest uppercase">{label}</span></span>
              {i < arr.length - 1 && <span className="text-white/10">·</span>}
            </span>
          ))}
        </div>

        {/* Legal + copyright */}
        <div className="flex flex-wrap justify-center gap-5 mb-4">
          {[
            { label: "Contact", href: "/contact" },
            { label: "Track order", href: "/order-status" },
            { label: "Privacy Policy", href: "/legal/privacy" },
            { label: "Terms & Conditions", href: "/legal/terms" },
            { label: "Legal & Returns", href: "/legal" },
            { label: "Cookie settings", href: "#cookie-settings" },
          ].map(({ label, href }) => (
            <a key={label} href={href}
              className="text-[#777] text-[11px] hover:text-white uppercase tracking-widest transition-colors">
              {label}
            </a>
          ))}
        </div>

        <div className="text-center text-[#888] text-[10px] tracking-wide space-y-1">
          <p>STACKED RACKS VINTAGE LTD · Company no. 15999498 · Registered in England and Wales</p>
          <p>Registered office: 114 Durnsford Road, London, England, SW19 8HQ</p>
          <p>© 2026 Stacked Racks Vintage Ltd · All Rights Reserved</p>
        </div>
      </div>
    </footer>
    </>
  );
}

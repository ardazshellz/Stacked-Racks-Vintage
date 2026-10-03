import TrustStrip from "./TrustStrip";

export default function Footer() {
  return (
    <>
    <TrustStrip />
    <footer className="bg-[#080808] border-t border-white/8 mt-0">
      {/* Top strip */}
      <div className="bg-[#F5C300] border-b border-[#0a0a0a] py-2">
        <p className="text-center font-display text-[#0a0a0a] text-[20px] font-extrabold tracking-[0.06em] uppercase">
          Stacked Racks Vintage · London, UK
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Logo + tagline */}
        <div className="text-center mb-8">
          <h2 className="font-display font-black uppercase leading-none text-4xl sm:text-5xl flex flex-wrap justify-center gap-x-3">
            <span className="text-[#E8500A]">STACKED</span>
            <span className="text-[#F5C300]">RACKS</span>
            <span className="text-white">VINTAGE</span>
          </h2>
          <p className="font-plexmono text-[#888] text-[11px] mt-3 tracking-[0.14em] uppercase">
            Rare Vintage Clothing · London
          </p>
        </div>

        {/* Social links */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mb-8">
          {[
            { label: "Instagram", href: "https://instagram.com/stacked_racks_vintage" },
            { label: "Vinted",    href: "https://www.vinted.co.uk/member/59714764-stackedracks" },
          ].map(({ label, href }) => (
            <a key={label} href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="font-plexmono text-[#d2d2d2] text-[13px] font-medium tracking-[0.12em] uppercase py-2 hover:text-[#F5C300] transition-colors">
              {label} →
            </a>
          ))}
        </div>

        {/* Stats scoreboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-white/10 mb-8 max-w-3xl mx-auto">
          {[
            { stat: "5,000+", label: "Sales" },
            { stat: "2,500+", label: "Vinted Reviews" },
            { stat: "1.4K",  label: "Followers" },
            { stat: "London", label: "Based" },
          ].map(({ stat, label }, i) => (
            <div key={stat} className={`px-4 py-5 text-center border-white/10 ${i % 2 === 1 ? "border-l" : ""} ${i > 0 ? "sm:border-l" : ""} ${i > 1 ? "border-t sm:border-t-0" : ""}`}>
              <div className="font-display text-[#F5C300] text-4xl font-black leading-[0.9] tabular-nums">{stat}</div>
              <div className="font-plexmono text-white/80 text-[11px] mt-2 tracking-[0.08em] uppercase">{label}</div>
            </div>
          ))}
        </div>

        {/* Legal + copyright */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 mb-6">
          {[
            { label: "Contact", href: "/contact" },
            { label: "Track order", href: "/order-status" },
            { label: "Privacy Policy", href: "/legal/privacy" },
            { label: "Terms & Conditions", href: "/legal/terms" },
            { label: "Legal & Returns", href: "/legal" },
            { label: "Cookie settings", href: "#cookie-settings" },
          ].map(({ label, href }) => (
            <a key={label} href={href}
              className="font-plexmono text-[#aaa] text-[11px] tracking-[0.08em] uppercase py-2 hover:text-white transition-colors">
              {label}
            </a>
          ))}
        </div>

        <div className="text-center text-[#888] text-[11px] tracking-wide space-y-1 border-t border-white/8 pt-6">
          <p>Business address: 114 Durnsford Road, London, England, SW19 8HQ</p>
          <p>© 2026 Stacked Racks Vintage · All Rights Reserved</p>
        </div>
      </div>
    </footer>
    </>
  );
}

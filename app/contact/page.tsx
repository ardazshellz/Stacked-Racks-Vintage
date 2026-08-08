import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <div className="mt-[92px] max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-[#E8500A] text-[10px] font-black tracking-[0.3em] uppercase mb-4">Get in touch</p>
          <h1
            className="text-white text-3xl sm:text-4xl font-black tracking-wider mb-4"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}
          >
            Contact Us
          </h1>
          <p className="text-[#aaa] text-sm leading-relaxed max-w-md mx-auto">
            Questions about an item, sizing, or your order? Reach us directly — we usually
            reply within a few hours.
          </p>
        </div>

        {/* Contact options */}
        <div className="space-y-4">
          {/* Instagram DM */}
          <a
            href="https://ig.me/m/stacked_racks_vintage"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-5 bg-[#111] border border-white/10 p-6 hover:border-[#E8500A]/50 transition-all group"
          >
            <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] shrink-0">
              <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm tracking-wide group-hover:text-[#E8500A] transition-colors">
                Instagram DM
              </p>
              <p className="text-[#555] text-xs mt-0.5">@stacked_racks_vintage · Fastest response</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#555] group-hover:text-[#E8500A] transition-colors shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>

          <a
            href="mailto:stackedracksvintage@gmail.com"
            className="flex items-center gap-5 bg-[#111] border border-white/10 p-6 hover:border-[#E8500A]/50 transition-all group"
          >
            <div className="w-10 h-10 flex items-center justify-center bg-[#1a1a1a] border border-white/10 shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-[#555]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm tracking-wide group-hover:text-[#E8500A] transition-colors">Email</p>
              <p className="text-[#555] text-xs mt-0.5">stackedracksvintage@gmail.com</p>
            </div>
          </a>

          {/* Vinted messages */}
          <a
            href="https://www.vinted.co.uk/member/59714764-stackedracks"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-5 bg-[#111] border border-white/10 p-6 hover:border-[#F5C300]/50 transition-all group"
          >
            <div className="w-10 h-10 flex items-center justify-center bg-[#1a1a1a] border border-white/10 shrink-0">
              <span className="text-[#F5C300] font-black text-lg">V</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm tracking-wide group-hover:text-[#F5C300] transition-colors">
                Vinted Message
              </p>
              <p className="text-[#555] text-xs mt-0.5">Message us directly on Vinted</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-[#555] group-hover:text-[#F5C300] transition-colors shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>

        {/* Response time note */}
        <div className="mt-10 text-center">
          <p className="text-[#333] text-xs tracking-wide">
            We&apos;re based in London, UK. We aim to reply within 24 hours on weekdays.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}

import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Stacked Racks Vintage Ltd collects, uses and protects your personal data.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-white text-lg font-black tracking-wider mb-4"
        style={{ fontFamily: "var(--font-playfair-display), serif" }}>
        {title}
      </h2>
      <div className="text-[#aaa] text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="mt-[92px] max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <p className="text-[#E8500A] text-[10px] font-black tracking-[0.3em] uppercase mb-3">Legal</p>
          <h1 className="text-white text-3xl font-black tracking-wider mb-2"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}>
            Privacy Policy
          </h1>
          <p className="text-[#555] text-sm">Last updated: May 2026 · Stacked Racks Vintage Ltd, London</p>
        </div>

        <div className="border-t border-white/5 pt-10">

          <Section title="Who We Are">
            <p>Stacked Racks Vintage Ltd is a company registered in England and Wales, trading as Stacked Racks Vintage. We sell authentic vintage clothing online.</p>
            <p>Contact: <a href="mailto:stackedracksvintage@gmail.com" className="text-[#E8500A]">stackedracksvintage@gmail.com</a></p>
          </Section>

          <Section title="What Data We Collect">
            <p>When you place an order we collect: your full name, email address, phone number, and delivery address. This is necessary to process and ship your order.</p>
            <p>When you sign up for our email list we collect your email address only.</p>
            <p>We use Google Analytics which automatically collects anonymised data including pages visited, time on site, device type, and general location (country/city level). No personally identifiable information is collected by Analytics.</p>
            <p>Stripe (our payment processor) collects your card details and billing information directly. We never see or store your card number.</p>
          </Section>

          <Section title="How We Use Your Data">
            <p><strong className="text-white">Order fulfilment</strong> — your name, email, phone and address are used solely to process your order, dispatch your item, and provide after-sale support.</p>
            <p><strong className="text-white">Email marketing</strong> — if you opted in, we may send occasional emails about new arrivals and promotions. You can unsubscribe at any time by replying to any email.</p>
            <p><strong className="text-white">Analytics</strong> — anonymised Google Analytics data is used to improve the website and understand how visitors use it.</p>
            <p><strong className="text-white">HMRC compliance</strong> — we are required by law to retain records of sales for tax purposes for a minimum of 6 years.</p>
          </Section>

          <Section title="Cookies">
            <p>We use the following cookies:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-white">Essential cookies</strong> — set by Stripe to process payments securely. Cannot be disabled.</li>
              <li><strong className="text-white">Analytics cookies</strong> — Google Analytics (_ga, _gid). Only set if you accept cookies.</li>
              <li><strong className="text-white">Preference cookies</strong> — we store your cookie consent choice and email subscription status locally in your browser.</li>
            </ul>
            <p>You can manage or delete cookies via your browser settings at any time.</p>
          </Section>

          <Section title="Data Sharing">
            <p>We do not sell your data. We share data only with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-white">Stripe</strong> — payment processing. <a href="https://stripe.com/gb/privacy" className="text-[#E8500A]" target="_blank" rel="noopener noreferrer">Stripe Privacy Policy</a></li>
              <li><strong className="text-white">Google Analytics</strong> — anonymised site analytics. <a href="https://policies.google.com/privacy" className="text-[#E8500A]" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
              <li><strong className="text-white">Supabase</strong> — our order database, hosted in the EU. <a href="https://supabase.com/privacy" className="text-[#E8500A]" target="_blank" rel="noopener noreferrer">Supabase Privacy Policy</a></li>
              <li><strong className="text-white">Royal Mail</strong> — your delivery address is shared to ship your order.</li>
            </ul>
          </Section>

          <Section title="Data Retention">
            <p>Order records are retained for 6 years as required by HMRC. Email marketing opt-ins are kept until you unsubscribe. Analytics data is retained for 26 months in Google Analytics.</p>
          </Section>

          <Section title="Your Rights (UK GDPR)">
            <p>Under UK GDPR you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data (subject to legal retention requirements)</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
            </ul>
            <p>To exercise any of these rights, email us at <a href="mailto:stackedracksvintage@gmail.com" className="text-[#E8500A]">stackedracksvintage@gmail.com</a>. We will respond within 30 days.</p>
          </Section>

          <Section title="Contact & Complaints">
            <p>If you have any concerns about how we use your data, please contact us first. You also have the right to lodge a complaint with the <a href="https://ico.org.uk" className="text-[#E8500A]" target="_blank" rel="noopener noreferrer">ICO (ico.org.uk)</a>.</p>
          </Section>

        </div>
      </div>
      <Footer />
    </div>
  );
}

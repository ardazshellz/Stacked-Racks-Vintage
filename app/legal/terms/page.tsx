import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for purchasing from Stacked Racks Vintage Ltd.",
  alternates: { canonical: "/legal/terms" },
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

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="mt-[92px] max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <p className="text-[#E8500A] text-[10px] font-black tracking-[0.3em] uppercase mb-3">Legal</p>
          <h1 className="text-white text-3xl font-black tracking-wider mb-2"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}>
            Terms & Conditions
          </h1>
          <p className="text-[#888] text-sm">Last updated: 9 August 2026 · Stacked Racks Vintage Ltd</p>
        </div>

        <div className="border-t border-white/5 pt-10">

          <Section title="1. Company Information">
            <p>Stacked Racks Vintage Ltd is registered in England and Wales under company number 15999498. Registered office: 114 Durnsford Road, London, England, SW19 8HQ.</p>
            <p>By accessing this website and purchasing from us, you agree to these terms and conditions in full.</p>
          </Section>

          <Section title="2. Products">
            <p>All items sold are authentic second-hand and vintage clothing. We personally source and verify every piece.</p>
            <p>Descriptions and condition gradings (Excellent, Good, Fair) are provided honestly and in good faith. Any vintage wear consistent with the age of the garment will be noted in the listing.</p>
            <p>Brand names referenced in listings (Nike, Adidas, Burberry, etc.) are the property of their respective owners. Their use is purely descriptive of second-hand items and does not imply any affiliation or endorsement.</p>
            <p>Most pieces are one-off. An item is temporarily reserved while its Stripe checkout is active and is removed from sale after confirmed payment.</p>
          </Section>

          <Section title="3. Pricing & Payment">
            <p>All prices are displayed in GBP (£). Prices shown are final and inclusive of all applicable taxes.</p>
            <p>Payment is processed securely via Stripe. We accept major credit and debit cards. We do not store your card details.</p>
            <p>A flat postage fee applies per order (displayed at checkout). International orders may be available — contact us via Instagram before ordering.</p>
          </Section>

          <Section title="4. Shipping">
            <p>Orders are dispatched within 24–48 hours of confirmed payment, excluding weekends and UK public holidays.</p>
            <p>Standard UK delivery via Royal Mail is typically 2–4 working days. Tracking information will be sent by email once dispatched.</p>
            <p>Please contact us if a parcel is delayed or lost. Where we arrange delivery, the item remains our responsibility until it is delivered to you or your nominated recipient.</p>
          </Section>

          <Section title="5. Returns & Refunds">
            <p>Under the Consumer Contracts Regulations 2013 and Consumer Rights Act 2015, you have the right to cancel and return most items within 14 days of receiving them without giving a reason.</p>
            <p>To cancel, contact us within 14 days of delivery via Instagram DM or <a href="mailto:stackedracksvintage@gmail.com" className="text-[#E8500A]">stackedracksvintage@gmail.com</a>. You do not need to give a reason. We may ask for photographs where an item is reported as faulty, damaged or not as described.</p>
            <p>Items must be returned in the same condition as received — unworn, unaltered, and with original packaging where applicable. Buyers cover return postage costs unless the item is faulty or significantly not as described.</p>
            <p>After cancellation, send the item back within 14 days. Refunds, including standard outbound delivery where required by law, are issued to the original payment method within 14 days of us receiving the item back or receiving evidence that it was sent.</p>
            <p>Nothing in these terms limits your statutory rights if an item is faulty or not as described.</p>
          </Section>

          <Section title="6. Intellectual Property">
            <p>All website content — including text, design, graphics and branding — is owned by Stacked Racks Vintage Ltd and may not be reproduced, copied or distributed without our prior written permission.</p>
          </Section>

          <Section title="7. Limitation of Liability">
            <p>To the maximum extent permitted by law, Stacked Racks Vintage Ltd is not liable for any indirect, incidental or consequential damages arising from your use of our website or products.</p>
            <p>Our total liability to you in connection with any purchase shall not exceed the total amount paid for that purchase.</p>
            <p>Nothing in these terms excludes or limits our liability for death or personal injury caused by negligence, fraud, or any other matter that cannot be excluded by law.</p>
          </Section>

          <Section title="8. Governing Law">
            <p>These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
          </Section>

          <Section title="9. Changes to These Terms">
            <p>We reserve the right to update these terms at any time. Continued use of the website following any changes constitutes acceptance of the new terms. The date of the most recent update is shown at the top of this page.</p>
          </Section>

          <Section title="10. Contact">
            <p>For any questions about these terms, email us at <a href="mailto:stackedracksvintage@gmail.com" className="text-[#E8500A]">stackedracksvintage@gmail.com</a> or DM us on <a href="https://instagram.com/stacked_racks_vintage" className="text-[#E8500A]">Instagram</a>.</p>
          </Section>

        </div>
      </div>
      <Footer />
    </div>
  );
}

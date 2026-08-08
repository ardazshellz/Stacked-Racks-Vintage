import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Legal",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2
        className="text-white text-xl font-black tracking-wider mb-5"
        style={{ fontFamily: "var(--font-playfair-display), serif" }}
      >
        {title}
      </h2>
      <div className="text-[#aaa] text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <div className="mt-[92px] max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-14">
          <p className="text-[#E8500A] text-[10px] font-black tracking-[0.3em] uppercase mb-4">Legal</p>
          <h1
            className="text-white text-3xl sm:text-4xl font-black tracking-wider mb-3"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}
          >
            Terms & Policies
          </h1>
          <p className="text-[#555] text-sm">Last updated: May 2026</p>
        </div>

        <div className="border-t border-white/5 pt-12">

          <Section title="Company Information">
            <p>Stacked Racks Vintage Ltd is a company registered in England and Wales.</p>
            <p>Registered address: London, United Kingdom.</p>
            <p>
              We sell authentic second-hand and vintage clothing. All purchases are processed
              through Vinted, which has its own buyer protection and checkout system.
            </p>
          </Section>

          <Section title="Terms & Conditions">
            <p>
              By accessing this website you agree to these terms. We reserve the right to update
              them at any time. Continued use of the site constitutes acceptance of any changes.
            </p>
            <p>
              All items listed are second-hand vintage clothing. Descriptions are provided in
              good faith and any vintage wear consistent with age will be noted in the listing.
            </p>
            <p>
              Prices are displayed in GBP (£) inclusive of VAT where applicable. Website
              purchases are processed securely by Stripe; items may also be available through
              our separate Vinted shop.
            </p>
            <p>
              We make no guarantees of availability. Items may sell before a listing is updated.
            </p>
          </Section>

          <Section title="Returns & Refunds">
            <p>
              Under the Consumer Contracts Regulations 2013 and Consumer Rights Act 2015, you
              have the right to cancel and return most items purchased online within 14 days of
              receiving them, without giving a reason.
            </p>
            <p>
              To initiate a return, please contact us via Instagram DM or the contact form.
              Items must be returned in the same condition as received, unworn and with original
              packaging where applicable.
            </p>
            <p>
              Refunds will be issued within 14 days of receiving the returned item. Return
              postage costs are the buyer&apos;s responsibility unless the item is faulty or
              significantly not as described.
            </p>
            <p>
              Vintage items with wear consistent with their age, as described in the listing,
              do not qualify for a return on the basis of that wear alone.
            </p>
          </Section>

          <Section title="Privacy Policy">
            <p>
              When you order, we collect the contact and delivery details needed to fulfil your
              purchase. Payments are processed securely by Stripe and order records are stored
              in Supabase. We never see or store your full card number.
            </p>
            <p>
              If you contact us via email or Instagram, your contact details will only be used
              to respond to your query. We will not sell or share your data with third parties.
            </p>
            <p>
              Under UK GDPR you have the right to request access to, correction of, or deletion
              of any personal data we hold about you. Contact us via the contact page to
              exercise these rights.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              Google Analytics cookies are only loaded after you accept them in the cookie
              banner. Stripe may use essential cookies when you choose to enter its secure
              checkout. See our full Privacy Policy for details.
            </p>
          </Section>

          <Section title="Intellectual Property">
            <p>
              All content on this website — including text, graphics, and brand identity — is
              owned by Stacked Racks Vintage Ltd and may not be reproduced without permission.
            </p>
            <p>
              Brand names referenced in product listings (e.g. Nike, Adidas, Burberry) are the
              property of their respective owners. Their mention is purely descriptive of
              second-hand items and does not imply any affiliation or endorsement.
            </p>
          </Section>

          <Section title="Governing Law">
            <p>
              These terms are governed by the laws of England and Wales. Any disputes shall be
              subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </Section>

        </div>

        {/* Contact CTA */}
        <div className="mt-10 border border-white/8 p-6 text-center">
          <p className="text-[#aaa] text-sm mb-4">Questions about our policies?</p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 text-xs text-[#E8500A] border border-[#E8500A] px-6 py-2.5 font-bold tracking-widest uppercase hover:bg-[#E8500A] hover:text-white transition-colors"
          >
            Contact Us
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}

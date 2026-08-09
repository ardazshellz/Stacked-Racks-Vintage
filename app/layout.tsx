import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Stacked Racks Vintage | 80s 90s 00s Vintage Clothing · London",
    template: "%s | Stacked Racks Vintage",
  },
  description:
    "Unique & Rare Vintage Clothing from the 80s, 90s & 00s. London-based limited company with 5,000+ sales and 2,500+ five-star reviews. Shop Nike, Adidas, Burberry and more.",
  keywords:
    "vintage clothing, 90s fashion, 80s fashion, streetwear, London vintage, rare vintage, Burberry, Nike, Adidas, Champion, vintage jackets, vintage shop London",
  openGraph: {
    type: "website",
    siteName: "Stacked Racks Vintage",
    title: "Stacked Racks Vintage | Rare 80s 90s 00s Clothing · London",
    description:
      "Unique & Rare Vintage Clothing. 5,000+ sales. London-based. Shop Nike, Adidas, Burberry and more.",
    images: [
      {
        url: "/hero-rail.jpg",
        width: 1200,
        height: 630,
        alt: "Stacked Racks Vintage — London Vintage Clothing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stacked Racks Vintage | London Vintage Clothing",
    description: "Rare 80s, 90s & 00s vintage clothing. 5,000+ sales.",
    images: ["/hero-rail.jpg"],
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "https://stackedracksvintage.co.uk"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={playfairDisplay.variable}>
      <body className="bg-[#0a0a0a] text-white antialiased overflow-x-hidden">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "OnlineStore",
          name: "Stacked Racks Vintage",
          legalName: "STACKED RACKS VINTAGE LTD",
          url: "https://stackedracksvintage.co.uk",
          email: "stackedracksvintage@gmail.com",
          identifier: "15999498",
          address: { "@type": "PostalAddress", streetAddress: "114 Durnsford Road", addressLocality: "London", postalCode: "SW19 8HQ", addressCountry: "GB" },
          sameAs: ["https://instagram.com/stacked_racks_vintage", "https://www.vinted.co.uk/member/59714764-stackedracks"],
        }).replace(/</g, "\\u003c") }} />
        <ClientShell />
        {children}
      </body>
    </html>
  );
}

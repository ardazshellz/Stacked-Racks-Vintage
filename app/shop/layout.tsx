import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse All Vintage Clothing",
  description:
    "Shop rare and unique vintage clothing. Filter by brand, size, era and category. Nike, Adidas, Burberry, Champion and more — all personally sourced.",
  openGraph: {
    title: "Shop Vintage Clothing | Stacked Racks Vintage",
    description: "Browse rare 80s, 90s & 00s vintage clothing. Nike, Adidas, Burberry and more.",
    images: [{ url: "/og-image.jpg" }],
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

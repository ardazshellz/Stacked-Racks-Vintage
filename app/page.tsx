import HomePageClient from "@/components/HomePageClient";
import { getPublicProducts } from "@/lib/server/catalog";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getPublicProducts().catch((error) => {
    console.error("Homepage catalogue load failed:", error);
    return [];
  });

  return <HomePageClient initialProducts={products} />;
}

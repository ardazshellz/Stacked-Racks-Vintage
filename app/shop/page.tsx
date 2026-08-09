import ShopPageClient from "@/components/ShopPageClient";
import { getPublicProducts } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await getPublicProducts().catch((error) => {
    console.error("Shop catalogue load failed:", error);
    return [];
  });

  return <ShopPageClient initialProducts={products} />;
}

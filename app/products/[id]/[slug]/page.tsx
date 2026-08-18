import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import AddToCartButton from "@/components/AddToCartButton";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ProductGallery from "@/components/ProductGallery";
import { getPublicProduct, getPublicProducts } from "@/lib/server/catalog";
import { productPath, productSlug } from "@/lib/product-url";
import { getVintedItemUrl, productGenderLabel, productSizeLabel } from "@/lib/products";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getPublicProduct(id).catch(() => null);
  if (!product) return { title: "Product unavailable" };
  const path = productPath(product);
  return {
    title: product.name,
    description: product.description.replace(/\s+/g, " ").slice(0, 155),
    alternates: { canonical: path },
    openGraph: {
      title: `${product.name} | Stacked Racks Vintage`,
      description: product.description.replace(/\s+/g, " ").slice(0, 155),
      url: path,
      type: "website",
      images: product.imageUrls?.[0] ? [{ url: product.imageUrls[0], alt: product.name }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id, slug } = await params;
  const product = await getPublicProduct(id).catch(() => null);
  if (!product) notFound();
  if (slug !== productSlug(product.name)) permanentRedirect(productPath(product));

  const products = await getPublicProducts().catch(() => [product]);
  const details = product.garmentDetails;
  const vintedItemUrl = getVintedItemUrl(product);
  const measurements = [["Pit to pit", details?.pitToPit], ["Length", details?.length], ["Sleeve", details?.sleeve]].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stackedracksvintage.co.uk";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.imageUrls ?? [],
    description: product.description,
    sku: String(product.id),
    brand: { "@type": "Brand", name: product.brand },
    itemCondition: "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      url: `${base}${productPath(product)}`,
      priceCurrency: "GBP",
      price: product.price.toFixed(2),
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "GB" },
        shippingRate: { "@type": "MonetaryAmount", currency: "GBP", value: product.price >= 50 ? 0 : 3.99 },
      },
    },
  };

  return <main className="min-h-screen min-w-0 overflow-x-clip bg-[#0a0a0a]">
    <Navbar products={products} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <div className="mt-[92px] w-full min-w-0 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link href="/shop" className="inline-flex min-h-11 items-center text-[#aaa] hover:text-white text-xs uppercase tracking-widest mb-6">← Back to shop</Link>
      <div className="grid min-w-0 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        <ProductGallery images={product.imageUrls ?? []} name={product.name} productId={String(product.id)} price={product.price} />
        <section className="min-w-0 max-w-full lg:sticky lg:top-28">
          <div className="flex items-center gap-2 mb-3">
            <span className="border border-[#E8500A]/60 bg-[#E8500A]/10 px-2.5 py-1.5 text-[#E8500A] text-[10px] font-black tracking-[0.14em] uppercase">{productGenderLabel(product)}</span>
            <span className="text-[#999] text-[10px] font-bold tracking-[0.16em] uppercase">{product.category}</span>
          </div>
          {vintedItemUrl ? <a href={vintedItemUrl} target="_blank" rel="noopener noreferrer" className="block text-white hover:text-[#F5C300] transition-colors" aria-label={`View ${product.name} on Vinted`}><h1 className="text-3xl sm:text-4xl font-black leading-tight mb-3" style={{ fontFamily: "var(--font-playfair-display), serif" }}>{product.name}</h1></a> : <h1 className="text-white text-3xl sm:text-4xl font-black leading-tight mb-3" style={{ fontFamily: "var(--font-playfair-display), serif" }}>{product.name}</h1>}
          <p className="text-[#bbb] mb-6">{product.brand} · Fits {productSizeLabel(product)}</p>
          <div className="space-y-3 text-[#ccc] text-sm leading-relaxed mb-6">{product.description.split("\n").filter(Boolean).map((line) => <p key={line}>{line}</p>)}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">{[["Size", productSizeLabel(product)], ["Era", product.era], ["Condition", product.condition], ["Fit", product.fit]].map(([label, value]) => <div key={label} className="bg-[#151515] border border-white/10 p-3"><p className="text-[#999] text-xs uppercase mb-1">{label}</p><p className="font-bold">{value}</p></div>)}</div>
          {measurements.length > 0 && <div className="border border-white/10 p-4 mb-6"><p className="font-black text-xs uppercase tracking-widest mb-3">Measurements · laid flat</p><div className="grid grid-cols-3 gap-3">{measurements.map(([label, value]) => <div key={label}><p className="text-[#999] text-xs">{label}</p><p className="font-bold">{value}</p></div>)}</div></div>}
          {details?.flaws && <div className="border border-white/10 p-4 mb-6"><p className="text-[#999] text-xs uppercase mb-1">Condition notes</p><p className="text-sm">{details.flaws}</p></div>}
          <div className="flex min-w-0 flex-col gap-4 border-y border-white/10 py-5 mb-5 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><p className="text-[#999] text-xs">{product.stock > 0 ? "In stock · one-off piece" : "This piece has sold"}</p><p className="text-[#999] text-xs mt-1">Tracked UK delivery · 14-day returns</p></div><p className="shrink-0 text-[#E8500A] text-3xl font-black">£{product.price.toFixed(2)}</p></div>
          {product.stock > 0 ? <div className="grid sm:grid-cols-2 gap-3"><AddToCartButton product={product} className="w-full min-h-12 bg-[#E8500A] text-white font-black text-xs tracking-[0.18em] uppercase" /><Link href={`/checkout?item=${product.id}`} className="min-h-12 border border-[#E8500A] text-[#E8500A] flex items-center justify-center font-black text-xs tracking-[0.18em] uppercase">Buy now</Link></div> : <Link href="/shop" className="min-h-12 flex items-center justify-center border border-white/20 text-white font-black uppercase text-xs tracking-widest">Browse available pieces</Link>}
          {vintedItemUrl && <a href={vintedItemUrl} target="_blank" rel="noopener noreferrer" className="mt-3 min-h-12 border border-[#F5C300]/60 text-[#F5C300] flex items-center justify-center font-black text-xs tracking-[0.18em] uppercase hover:bg-[#F5C300]/10">View this item on Vinted ↗</a>}
        </section>
      </div>
    </div>
    <Footer />
  </main>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import AddToCartButton from "@/components/AddToCartButton";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import OwnerSalePanel from "@/components/OwnerSalePanel";
import ProductGallery from "@/components/ProductGallery";
import SizeGuideLink from "@/components/SizeGuideLink";
import { getPublicProduct, getPublicProducts } from "@/lib/server/catalog";
import { isAdminRequest } from "@/lib/server/admin-auth";
import { productPath, productSlug } from "@/lib/product-url";
import { getVintedItemUrl, productGenderLabel, productSizeLabel, websiteProductTitle } from "@/lib/products";

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
  const isOwner = await isAdminRequest().catch(() => false);
  const details = product.garmentDetails;
  const vintedItemUrl = getVintedItemUrl(product);
  const displayTitle = websiteProductTitle(product.name);
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
      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-8 lg:gap-10 items-start">
        <ProductGallery images={product.imageUrls ?? []} name={product.name} productId={String(product.id)} price={product.price} />
        <section className="min-w-0 max-w-full lg:sticky lg:top-28">
          <div className="flex items-center gap-3 mb-3">
            <span className="border border-[#E8500A]/60 bg-[#E8500A]/10 px-2.5 py-1.5 text-[#E8500A] text-xs font-bold">{productGenderLabel(product)}</span>
            <span className="text-[#a39b90] text-sm font-semibold">{product.category}</span>
          </div>
          {vintedItemUrl ? <a href={vintedItemUrl} target="_blank" rel="noopener noreferrer" className="block text-white hover:text-[#F5C300] transition-colors" aria-label={`View ${product.name} on Vinted`}><h1 className="text-4xl sm:text-5xl font-black uppercase leading-[0.92] text-balance" style={{ fontFamily: "var(--font-big-shoulders), Impact, sans-serif" }}>{displayTitle}</h1></a> : <h1 className="text-white text-4xl sm:text-5xl font-black uppercase leading-[0.92] text-balance" style={{ fontFamily: "var(--font-big-shoulders), Impact, sans-serif" }}>{displayTitle}</h1>}
          <p className="mt-2 text-[#c9c2b8] text-base">{product.brand}, fits {productSizeLabel(product)}</p>
          <p className="mt-4 text-[#E8500A] text-5xl font-extrabold leading-none tabular-nums" style={{ fontFamily: "var(--font-big-shoulders), Impact, sans-serif" }}>£{product.price.toFixed(2)}</p>
          <p className="mt-2 flex items-center gap-2 text-[15px] text-[#cfe9da]">{product.stock > 0 ? <><i className="inline-block size-2 rounded-full bg-[#5BC48A]" aria-hidden="true" />In stock. One-off piece.</> : <span className="text-[#c9c2b8]">This piece has sold</span>}</p>
          <div className="mt-5">
            <p className="mb-2 text-[15px] font-bold">Size</p>
            <div className="flex flex-wrap items-center gap-3"><span className="inline-flex min-h-12 min-w-24 items-center justify-center border-2 border-[#EDE8DF] bg-[#EDE8DF] px-4 font-bold text-[#0a0a0a]">{productSizeLabel(product)}</span><SizeGuideLink /></div>
          </div>
          {product.stock > 0 ? <div className="mt-5 grid gap-2.5"><AddToCartButton product={product} className="w-full min-h-[52px] bg-[#E8500A] text-[#0a0a0a] font-bold text-base tracking-[0.08em] uppercase hover:bg-[#FF6A24] transition-colors" /><Link href={`/checkout?item=${product.id}`} className="min-h-[52px] border-2 border-[#F5C300] text-[#F5C300] flex items-center justify-center font-bold text-base tracking-[0.08em] uppercase hover:bg-[#F5C300] hover:text-[#0a0a0a] transition-colors">Buy now</Link></div> : <Link href="/shop" className="mt-5 min-h-[52px] flex items-center justify-center border border-white/20 text-white font-bold uppercase text-sm tracking-widest">Browse available pieces</Link>}
          {isOwner && <OwnerSalePanel productId={String(product.id)} price={product.price} costPrice={product.costPrice} boughtFrom={product.source} costTaxYear={product.costTaxYear} sold={product.stock <= 0} />}
          {vintedItemUrl && <a href={vintedItemUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-12 items-center text-[#a39b90] hover:text-white text-[15px]">View this item on Vinted</a>}
        </section>
      </div>
      <div className="mt-10 grid gap-8 border-t border-white/10 pt-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-10">
        <div><h2 className="mb-3 text-3xl font-extrabold uppercase" style={{ fontFamily: "var(--font-big-shoulders), Impact, sans-serif" }}>Details</h2><div className="space-y-3 text-[17px] leading-relaxed text-[#ddd6cb] max-w-[62ch]">{product.description.split("\n").filter(Boolean).map((line) => <p key={line}>{line}</p>)}</div></div>
        <dl className="grid grid-cols-2 border-l border-t border-white/10 self-start">
          {[["Fits", productSizeLabel(product)], ["Era", product.era], ["Condition", product.condition], ["Fit", product.fit], ...measurements].map(([label, value]) => <div key={label} className="border-b border-r border-white/10 p-4"><dt className="text-sm text-[#a39b90]">{label}</dt><dd className="mt-0.5 text-[17px] font-bold">{value}</dd></div>)}
          {details?.flaws && <div className="col-span-2 border-b border-r border-white/10 p-4"><dt className="text-sm text-[#a39b90]">Condition notes</dt><dd className="mt-0.5 text-[17px] font-bold">{details.flaws}</dd></div>}
        </dl>
      </div>
    </div>
    <Footer />
  </main>;
}

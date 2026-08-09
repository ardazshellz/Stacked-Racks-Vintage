import { getPublicProducts } from "@/lib/server/catalog";
import { productPath } from "@/lib/product-url";

export const dynamic = "force-dynamic";

function xml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ?? character);
}

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stackedracksvintage.co.uk";
  const products = await getPublicProducts();
  const items = products.map((product) => `<item>
    <g:id>${xml(product.id)}</g:id>
    <title>${xml(product.name)}</title>
    <description>${xml(product.description)}</description>
    <link>${xml(`${baseUrl}${productPath(product)}`)}</link>
    <g:image_link>${xml(product.imageUrls?.[0] ?? `${baseUrl}/hero-rail.jpg`)}</g:image_link>
    <g:availability>${product.stock > 0 ? "in_stock" : "out_of_stock"}</g:availability>
    <g:price>${product.price.toFixed(2)} GBP</g:price>
    <g:condition>used</g:condition>
    <g:brand>${xml(product.brand)}</g:brand>
    <g:identifier_exists>no</g:identifier_exists>
    <g:age_group>adult</g:age_group>
    <g:gender>${product.gender === "Mens" ? "male" : "female"}</g:gender>
    <g:size>${xml(product.size)}</g:size>
  </item>`).join("\n");
  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel>
  <title>Stacked Racks Vintage</title>
  <link>${xml(baseUrl)}</link>
  <description>One-off vintage clothing from London</description>
  ${items}
</channel></rss>`;
  return new Response(feed, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900, s-maxage=900" } });
}

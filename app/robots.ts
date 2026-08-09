import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://stackedracksvintage.co.uk";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/checkout/", "/order-confirmation/", "/order-status/", "/unsubscribe/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

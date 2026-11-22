import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theridestory.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/examples/"], disallow: ["/app", "/b/", "/join/", "/api/"] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}

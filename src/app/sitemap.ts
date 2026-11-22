import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://theridestory.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/examples/oaxaca`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/examples/ventoux`, changeFrequency: "monthly", priority: 0.7 },
  ];
}

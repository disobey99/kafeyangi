import type { MetadataRoute } from "next";
import { getSeoSiteUrl } from "@/lib/site-seo";

export default function robots(): MetadataRoute.Robots {
  const base = getSeoSiteUrl().replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/shop"],
        disallow: [
          "/api/",
          "/dashboard",
          "/dashboard/",
          "/platform",
          "/platform/",
          "/kitchen/",
          "/cashier/",
          "/staff/",
          "/display/",
          "/m",
          "/c/",
          "/tg/",
          "/uploads/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

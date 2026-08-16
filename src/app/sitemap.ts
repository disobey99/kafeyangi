import type { MetadataRoute } from "next";
import { getSeoSiteUrl } from "@/lib/site-seo";

/** Ommaviy (indekslanadigan) sahifalar */
const PUBLIC_PATHS: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/login", changeFrequency: "monthly", priority: 0.8 },
  { path: "/register", changeFrequency: "monthly", priority: 0.8 },
  { path: "/shop", changeFrequency: "weekly", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSeoSiteUrl().replace(/\/$/, "");
  const lastModified = new Date();

  return PUBLIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: path === "/" ? `${base}/` : `${base}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}

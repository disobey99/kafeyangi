import { getConfiguredAppUrl } from "@/lib/app-url";

export const SITE_NAME = "Nookline";
export const SITE_TITLE =
  "Nookline — Kafe va Restoran Boshqaruv Tizimi";
export const SITE_DESCRIPTION =
  "Nookline — kafe, restoran va oshxonalar uchun onlayn buyurtma, kassa va ofitsiantlar boshqaruvi tizimi.";

/** SEO / OG uchun asosiy domen (nookline.uz afzal) */
export function getSeoSiteUrl(): string {
  const configured = getConfiguredAppUrl();
  if (!configured) return "https://nookline.uz";
  try {
    const host = new URL(configured).hostname.toLowerCase();
    if (host === "nookline.uz" || host.endsWith(".nookline.uz")) {
      return configured;
    }
    // Vercel preview — brend domenini SEO uchun ishlatamiz
    if (host.endsWith("vercel.app")) {
      return "https://nookline.uz";
    }
  } catch {
    /* ignore */
  }
  return configured;
}

export const SITE_OG_IMAGE = "/brand/nookline-logo-full.png";

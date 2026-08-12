/** Platforma asosiy domeni (masalan cafe.uz) — Pro kafe subdomainlari uchun */

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "admin",
  "app",
  "cdn",
  "mail",
  "smtp",
  "ftp",
  "static",
  "assets",
  "dashboard",
  "platform",
  "login",
  "status",
]);

export function getPlatformRootDomain(): string {
  return (
    process.env.PLATFORM_ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN ||
    ""
  )
    .toLowerCase()
    .trim()
    .replace(/^www\./, "");
}

/** feel_Food Cafe! → feel-food-cafe */
export function normalizeSubdomainLabel(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function buildPlatformHost(
  subdomain: string,
  root = getPlatformRootDomain(),
): string | null {
  const label = normalizeSubdomainLabel(subdomain);
  if (!root || !label || RESERVED_SUBDOMAINS.has(label)) return null;
  return `${label}.${root}`;
}

/** feel-food.cafe.uz → feel-food (faqat 1-darajali subdomain) */
export function parsePlatformSubdomain(
  host: string,
  root = getPlatformRootDomain(),
): string | null {
  if (!root || !host) return null;
  const h = host.toLowerCase().split(":")[0] ?? "";
  if (!h || h === root || h === `www.${root}`) return null;
  if (!h.endsWith(`.${root}`)) return null;
  const sub = h.slice(0, -(root.length + 1));
  if (!sub || sub.includes(".")) return null;
  if (RESERVED_SUBDOMAINS.has(sub)) return null;
  return sub;
}

export function normalizeCustomHost(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

export function isReservedSubdomain(label: string): boolean {
  return RESERVED_SUBDOMAINS.has(normalizeSubdomainLabel(label));
}

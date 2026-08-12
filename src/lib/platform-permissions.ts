/** Client + server uchun xavfsiz (next/headers / prisma yo'q) */

export type PlatformStaffRole = "ADMIN" | "SUPPORT" | "ANALYST";

export const PLATFORM_PERMISSION_KEYS = [
  "menu.dashboard",
  "menu.cafes",
  "menu.insights",
  "menu.payments",
  "menu.map",
  "menu.reports",
  "menu.support",
  "menu.settings",
  "action.cafes.manage",
  "action.payments.manage",
  "action.support.reply",
  "action.settings.edit",
  "flag.hide_revenue",
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSION_KEYS)[number];

export type PlatformPermissionDef = {
  key: PlatformPermission;
  label: string;
  group: "Menyu" | "Amallar" | "Maxfiylik";
};

export const PLATFORM_PERMISSION_DEFS: PlatformPermissionDef[] = [
  { key: "menu.dashboard", label: "Bosh sahifa", group: "Menyu" },
  { key: "menu.cafes", label: "Mijozlar (kafelar)", group: "Menyu" },
  { key: "menu.insights", label: "Mijozlar tahlili", group: "Menyu" },
  { key: "menu.payments", label: "To'lovlar va obunalar", group: "Menyu" },
  { key: "menu.map", label: "Xarita", group: "Menyu" },
  { key: "menu.reports", label: "Hisobotlar", group: "Menyu" },
  { key: "menu.support", label: "Qo'llab-quvvatlash", group: "Menyu" },
  { key: "menu.settings", label: "Sozlamalar", group: "Menyu" },
  {
    key: "action.cafes.manage",
    label: "Kafelarni o'zgartirish (status, tarif)",
    group: "Amallar",
  },
  {
    key: "action.payments.manage",
    label: "To'lov / obunani boshqarish",
    group: "Amallar",
  },
  {
    key: "action.support.reply",
    label: "Supportga javob yozish",
    group: "Amallar",
  },
  {
    key: "action.settings.edit",
    label: "Platforma sozlamalarini o'zgartirish",
    group: "Amallar",
  },
  {
    key: "flag.hide_revenue",
    label: "Daromadni yashirish",
    group: "Maxfiylik",
  },
];

export const ROLE_PERMISSION_PRESETS: Record<PlatformStaffRole, PlatformPermission[]> = {
  SUPPORT: [
    "menu.dashboard",
    "menu.cafes",
    "menu.support",
    "action.support.reply",
  ],
  ANALYST: [
    "menu.dashboard",
    "menu.cafes",
    "menu.insights",
    "menu.payments",
    "menu.map",
    "menu.reports",
  ],
  ADMIN: [
    "menu.dashboard",
    "menu.cafes",
    "menu.insights",
    "menu.payments",
    "menu.map",
    "menu.reports",
    "menu.support",
    "menu.settings",
    "action.cafes.manage",
    "action.payments.manage",
    "action.support.reply",
    "action.settings.edit",
  ],
};

const NAV_PERMISSION: Record<string, PlatformPermission | "super"> = {
  "/platform": "menu.dashboard",
  "/platform/cafes": "menu.cafes",
  "/platform/insights": "menu.insights",
  "/platform/payments": "menu.payments",
  "/platform/map": "menu.map",
  "/platform/reports": "menu.reports",
  "/platform/support": "menu.support",
  "/platform/settings": "menu.settings",
  "/platform/staff": "super",
};

export function isPlatformPermission(value: string): value is PlatformPermission {
  return (PLATFORM_PERMISSION_KEYS as readonly string[]).includes(value);
}

export function parsePermissionsJson(raw: string | null | undefined): PlatformPermission[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is PlatformPermission => typeof p === "string" && isPlatformPermission(p),
    );
  } catch {
    return [];
  }
}

export function normalizePermissions(input: unknown): PlatformPermission[] {
  if (!Array.isArray(input)) return [];
  return [
    ...new Set(
      input.filter(
        (p): p is PlatformPermission => typeof p === "string" && isPlatformPermission(p),
      ),
    ),
  ];
}

export function permissionsToJson(perms: PlatformPermission[]): string {
  return JSON.stringify(normalizePermissions(perms));
}

export type PlatformAccessPerms = PlatformPermission[] | "ALL";

export function hasPlatformPermission(
  perms: PlatformAccessPerms,
  key: PlatformPermission,
): boolean {
  if (perms === "ALL") return true;
  return perms.includes(key);
}

/** Super admin (ALL) hech qachon yashirmaydi — faqat belgilangan xodimlar */
export function shouldHidePlatformRevenue(perms: PlatformAccessPerms): boolean {
  if (perms === "ALL") return false;
  return perms.includes("flag.hide_revenue");
}

export const HIDDEN_MONEY_LABEL = "***";

export function maskPlatformMoney(value: string, hide: boolean): string {
  return hide ? HIDDEN_MONEY_LABEL : value;
}

export function navAllowedForPermissions(
  href: string,
  perms: PlatformAccessPerms,
): boolean {
  const need = NAV_PERMISSION[href];
  if (!need) return perms === "ALL";
  if (need === "super") return perms === "ALL";
  return hasPlatformPermission(perms, need);
}

export function menuPermissionForPath(
  pathname: string,
): PlatformPermission | "super" | null {
  if (pathname === "/platform") return "menu.dashboard";
  const hit = Object.entries(NAV_PERMISSION).find(
    ([href]) => href !== "/platform" && pathname.startsWith(href),
  );
  return hit ? hit[1] : null;
}

import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import {
  type PlanCurrency,
  type PlanDiscountConfig,
  type PlanId,
  type PlatformSettings,
} from "@/lib/platform-settings-types";

export type {
  PlanCurrency,
  PlanDiscountConfig,
  PlanId,
  PlatformSettings,
} from "@/lib/platform-settings-types";

export type PublicSupportContacts = {
  title: string;
  phone: string;
  telegram: string;
  instagram: string;
  email: string;
};

const DEFAULT_PLAN_PRICES: Record<PlanId, number> = {
  STARTER: 9,
  STANDARD: 19,
  PRO: 39,
};

function defaultPlanDiscount(): PlanDiscountConfig {
  return { enabled: false, percent: 0, validFrom: "", validTo: "" };
}

const DEFAULT_PLAN_DISCOUNTS: Record<PlanId, PlanDiscountConfig> = {
  STARTER: defaultPlanDiscount(),
  STANDARD: defaultPlanDiscount(),
  PRO: defaultPlanDiscount(),
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  companyName: "Nookline",
  contactEmail: "info@nookline.uz",
  contactPhone: "+998 71 200 00 00",
  socialInstagram: "",
  socialTelegram: "",
  socialFacebook: "",
  notifyNewCustomer: true,
  notifyPaymentOverdue: true,
  notifyWeeklyReport: false,
  supportPhone: "",
  supportTelegram: "",
  supportInstagram: "",
  supportTitle: "Qo'llab-quvvatlash",
  planCurrency: "USD",
  planPrices: { ...DEFAULT_PLAN_PRICES },
  planDiscounts: {
    STARTER: defaultPlanDiscount(),
    STANDARD: defaultPlanDiscount(),
    PRO: defaultPlanDiscount(),
  },
};

const FILE = path.join(process.cwd(), "data", "platform-settings.json");

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

function parsePlanDiscount(raw: unknown): PlanDiscountConfig {
  const d = (raw ?? {}) as Partial<PlanDiscountConfig>;
  return {
    enabled: Boolean(d.enabled),
    percent: Math.min(90, Math.max(0, Math.round(Number(d.percent) || 0))),
    validFrom: asString(d.validFrom),
    validTo: asString(d.validTo),
  };
}

function parsePlanPrices(raw: unknown): Record<PlanId, number> {
  const src = (raw ?? {}) as Partial<Record<PlanId, number>>;
  return {
    STARTER: asNumber(src.STARTER, DEFAULT_PLAN_PRICES.STARTER),
    STANDARD: asNumber(src.STANDARD, DEFAULT_PLAN_PRICES.STANDARD),
    PRO: asNumber(src.PRO, DEFAULT_PLAN_PRICES.PRO),
  };
}

function parsePlanDiscounts(raw: unknown): Record<PlanId, PlanDiscountConfig> {
  const src = (raw ?? {}) as Partial<Record<PlanId, PlanDiscountConfig>>;
  return {
    STARTER: parsePlanDiscount(src.STARTER),
    STANDARD: parsePlanDiscount(src.STANDARD),
    PRO: parsePlanDiscount(src.PRO),
  };
}

function parsePlanCurrency(raw: unknown): PlanCurrency {
  return raw === "UZS" ? "UZS" : "USD";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}
export function normalizeSocialUrl(
  network: "instagram" | "telegram" | "facebook",
  raw: string,
): string {
  const value = raw.trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) return value;

  const handle = value.replace(/^@/, "").replace(/^\/+/, "");
  if (!handle) return "";

  if (network === "instagram") return `https://instagram.com/${handle}`;
  if (network === "telegram") return `https://t.me/${handle}`;
  return `https://facebook.com/${handle}`;
}

export function getPublicSupportContacts(): PublicSupportContacts {
  const s = getPlatformSettings();
  const phone = s.supportPhone.trim() || s.contactPhone.trim();
  const telegram =
    normalizeSocialUrl("telegram", s.supportTelegram) ||
    normalizeSocialUrl("telegram", s.socialTelegram);
  const instagram =
    normalizeSocialUrl("instagram", s.supportInstagram) ||
    normalizeSocialUrl("instagram", s.socialInstagram);
  const email = s.contactEmail.trim();

  return {
    title: s.supportTitle || DEFAULT_PLATFORM_SETTINGS.supportTitle,
    phone,
    telegram,
    instagram,
    email,
  };
}

export function getPlatformSocialLinks(settings: PlatformSettings) {
  return [
    {
      id: "instagram" as const,
      label: "Instagram",
      href: normalizeSocialUrl("instagram", settings.socialInstagram),
    },
    {
      id: "telegram" as const,
      label: "Telegram",
      href: normalizeSocialUrl("telegram", settings.socialTelegram),
    },
    {
      id: "facebook" as const,
      label: "Facebook",
      href: normalizeSocialUrl("facebook", settings.socialFacebook),
    },
  ].filter((item) => item.href);
}

export function getPlatformSettings(): PlatformSettings {
  try {
    if (!existsSync(FILE)) return { ...DEFAULT_PLATFORM_SETTINGS };
    const raw = JSON.parse(readFileSync(FILE, "utf8")) as Partial<PlatformSettings>;
    return {
      companyName:
        asString(raw.companyName) || DEFAULT_PLATFORM_SETTINGS.companyName,
      contactEmail:
        asString(raw.contactEmail) || DEFAULT_PLATFORM_SETTINGS.contactEmail,
      contactPhone: asString(raw.contactPhone, DEFAULT_PLATFORM_SETTINGS.contactPhone),
      socialInstagram: asString(raw.socialInstagram),
      socialTelegram: asString(raw.socialTelegram),
      socialFacebook: asString(raw.socialFacebook),
      notifyNewCustomer:
        typeof raw.notifyNewCustomer === "boolean"
          ? raw.notifyNewCustomer
          : DEFAULT_PLATFORM_SETTINGS.notifyNewCustomer,
      notifyPaymentOverdue:
        typeof raw.notifyPaymentOverdue === "boolean"
          ? raw.notifyPaymentOverdue
          : DEFAULT_PLATFORM_SETTINGS.notifyPaymentOverdue,
      notifyWeeklyReport:
        typeof raw.notifyWeeklyReport === "boolean"
          ? raw.notifyWeeklyReport
          : DEFAULT_PLATFORM_SETTINGS.notifyWeeklyReport,
      supportPhone: asString(raw.supportPhone),
      supportTelegram: asString(raw.supportTelegram),
      supportInstagram: asString(raw.supportInstagram),
      supportTitle: asString(raw.supportTitle) || DEFAULT_PLATFORM_SETTINGS.supportTitle,
      planCurrency: parsePlanCurrency(raw.planCurrency),
      planPrices: parsePlanPrices(raw.planPrices),
      planDiscounts: parsePlanDiscounts(raw.planDiscounts),
    };
  } catch {
    return { ...DEFAULT_PLATFORM_SETTINGS };
  }
}

export function savePlatformSettings(
  patch: Partial<PlatformSettings>,
): PlatformSettings {
  const current = getPlatformSettings();
  const next: PlatformSettings = { ...current, ...patch };

  if (patch.companyName !== undefined) {
    next.companyName = patch.companyName.trim() || DEFAULT_PLATFORM_SETTINGS.companyName;
  }
  if (patch.contactEmail !== undefined) {
    next.contactEmail = patch.contactEmail.trim() || DEFAULT_PLATFORM_SETTINGS.contactEmail;
  }
  if (patch.contactPhone !== undefined) {
    next.contactPhone = patch.contactPhone.trim();
  }
  if (patch.socialInstagram !== undefined) {
    next.socialInstagram = patch.socialInstagram.trim();
  }
  if (patch.socialTelegram !== undefined) {
    next.socialTelegram = patch.socialTelegram.trim();
  }
  if (patch.socialFacebook !== undefined) {
    next.socialFacebook = patch.socialFacebook.trim();
  }
  if (patch.supportPhone !== undefined) next.supportPhone = patch.supportPhone.trim();
  if (patch.supportTelegram !== undefined) next.supportTelegram = patch.supportTelegram.trim();
  if (patch.supportInstagram !== undefined) next.supportInstagram = patch.supportInstagram.trim();
  if (patch.supportTitle !== undefined) {
    next.supportTitle = patch.supportTitle.trim() || DEFAULT_PLATFORM_SETTINGS.supportTitle;
  }
  if (patch.planCurrency !== undefined) {
    next.planCurrency = parsePlanCurrency(patch.planCurrency);
  }
  if (patch.planPrices !== undefined) {
    next.planPrices = parsePlanPrices({ ...current.planPrices, ...patch.planPrices });
  }
  if (patch.planDiscounts !== undefined) {
    const merged = { ...current.planDiscounts };
    for (const key of ["STARTER", "STANDARD", "PRO"] as PlanId[]) {
      if (patch.planDiscounts[key]) {
        merged[key] = parsePlanDiscount({
          ...current.planDiscounts[key],
          ...patch.planDiscounts[key],
        });
      }
    }
    next.planDiscounts = merged;
  }

  mkdirSync(path.dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(next, null, 2), "utf8");
  return next;
}

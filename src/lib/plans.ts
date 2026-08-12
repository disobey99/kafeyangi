import { SubscriptionPlan } from "@prisma/client";
import type { PlanCurrency } from "@/lib/platform-settings-types";

export type { PlanCurrency } from "@/lib/platform-settings-types";
export type PlanId = SubscriptionPlan;

export type PlanFeatures = {
  /** Onlayn savdo / yetkazish ilova (Standard+) */
  onlineOrders: boolean;
  /** Mijoz QR menyudan ofitsiant chaqirishi */
  waiterCall: boolean;
  /** Asosiy savdo hisobotlari */
  reports: boolean;
  /** Kunlik / haftalik savdo tahlili */
  dailySalesAnalysis: boolean;
  /** ABC mahsulot tahlili */
  abcAnalysis: boolean;
  floorPlan: boolean;
  promos: boolean;
  telegram: boolean;
  customDashboardTheme: boolean;
  /** Ombor qoldig'i, ratsiya, blind count */
  inventoryRation: boolean;
  /** Muzlatgich IoT nazorati */
  freezerMonitoring: boolean;
  /** Operations Hub (smena, IoT, chat va boshqalar) */
  operationsHub: boolean;
  /** Ko'p filial boshqaruvi */
  multiBranch: boolean;
  /** Kengaytirilgan xodim samaradorligi */
  staffEfficiency: boolean;
  /** Platforma subdomain yoki o‘z domeni (nomingiz.kafenomi.uz) — faqat Pro */
  customDomain: boolean;
};

export type PlanConfig = {
  id: PlanId;
  name: string;
  priceSom: number;
  description: string;
  maxTables: number;
  maxStaff: number;
  maxProducts: number;
  features: PlanFeatures;
};

const STARTER_FEATURES: PlanFeatures = {
  onlineOrders: false,
  waiterCall: true,
  reports: false,
  dailySalesAnalysis: false,
  abcAnalysis: false,
  floorPlan: false,
  promos: false,
  telegram: false,
  customDashboardTheme: false,
  inventoryRation: false,
  freezerMonitoring: false,
  operationsHub: false,
  multiBranch: false,
  staffEfficiency: false,
  customDomain: false,
};

const STANDARD_FEATURES: PlanFeatures = {
  onlineOrders: true,
  waiterCall: true,
  reports: true,
  dailySalesAnalysis: true,
  abcAnalysis: false,
  floorPlan: true,
  promos: true,
  telegram: true,
  customDashboardTheme: true,
  inventoryRation: false,
  freezerMonitoring: false,
  operationsHub: false,
  multiBranch: false,
  staffEfficiency: true,
  customDomain: false,
};

const PRO_FEATURES: PlanFeatures = {
  onlineOrders: true,
  waiterCall: true,
  reports: true,
  dailySalesAnalysis: true,
  abcAnalysis: true,
  floorPlan: true,
  promos: true,
  telegram: true,
  customDashboardTheme: true,
  inventoryRation: true,
  freezerMonitoring: true,
  operationsHub: true,
  multiBranch: true,
  staffEfficiency: true,
  customDomain: true,
};

export const PLANS: Record<PlanId, PlanConfig> = {
  STARTER: {
    id: "STARTER",
    name: "Starter",
    priceSom: 9,
    description: "Kichik kafe va kofeynalar uchun",
    maxTables: 20,
    maxStaff: 3,
    maxProducts: 30,
    features: STARTER_FEATURES,
  },
  STANDARD: {
    id: "STANDARD",
    name: "Standard",
    priceSom: 19,
    description: "O'sib borayotgan kafe va restoranlar uchun",
    maxTables: 30,
    maxStaff: 10,
    maxProducts: 100,
    features: STANDARD_FEATURES,
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceSom: 39,
    description: "Tarmoq va professional operatsiyalar uchun",
    maxTables: 999,
    maxStaff: 999,
    maxProducts: 999,
    features: PRO_FEATURES,
  },
};

export const PLAN_FEATURE_LABELS: Record<keyof PlanFeatures, string> = {
  onlineOrders: "Onlayn buyurtma (olib ketish / yetkazish)",
  waiterCall: "Mijoz ofitsiant chaqirishi (QR)",
  reports: "Asosiy savdo hisobotlari",
  dailySalesAnalysis: "Kunlik savdo tahlili",
  abcAnalysis: "ABC mahsulot tahlili",
  floorPlan: "Vizual zal sxemasi",
  promos: "Aksiyalar va chegirmalar",
  telegram: "Telegram bot (buyurtma + hisobot)",
  customDashboardTheme: "Dashboard rang temasi",
  inventoryRation: "Ombor va ratsiya nazorati",
  freezerMonitoring: "Muzlatgich IoT nazorati",
  operationsHub: "Operations Hub",
  multiBranch: "Ko'p filial boshqaruvi",
  staffEfficiency: "Xodim samaradorligi statistikasi",
  customDomain: "Kafe subdomain / o‘z domeni (nomingiz.kafenomi.uz)",
};

export function getPlanConfig(plan: PlanId): PlanConfig {
  return PLANS[plan] ?? PLANS.STARTER;
}

/** Sinov davrida Standard limitlari; Pro tanlangan bo'lsa Pro imkoniyatlari */
export function getEffectivePlanConfig(
  plan: PlanId,
  status: string
): PlanConfig {
  const base = getPlanConfig(plan);
  if (status !== "TRIAL") return base;

  const standard = getPlanConfig("STANDARD");
  const trialFeatures: PlanFeatures =
    plan === "PRO"
      ? PRO_FEATURES
      : {
          ...STANDARD_FEATURES,
          onlineOrders: true,
          waiterCall: true,
          customDomain: false,
        };

  return {
    ...base,
    maxTables: Math.max(base.maxTables, standard.maxTables),
    maxStaff: Math.max(base.maxStaff, standard.maxStaff),
    maxProducts: Math.max(base.maxProducts, standard.maxProducts),
    features: trialFeatures,
  };
}

export function planLabel(plan: PlanId): string {
  return getPlanConfig(plan).name;
}

export function formatPlanPrice(amount: number, currency: PlanCurrency = "USD"): string {
  return formatSom(amount, currency) + "/oy";
}

export const formatMonthlyPrice = formatPlanPrice;

export const YEARLY_BONUS_MONTHS = 2;

/** Obuna narxi — valyuta admin sozlamasidan */
export function formatSom(amount: number, currency: PlanCurrency = "USD"): string {
  if (currency === "UZS") {
    return amount.toLocaleString("uz-UZ") + " so'm";
  }
  return `$${amount.toLocaleString("en-US")}`;
}

/** BillingInvoice.amount va MRR kabi sent/tiyinlarda saqlangan summa */
export function formatPlanCents(cents: number, currency: PlanCurrency = "USD"): string {
  return formatSom(Math.floor(cents / 100), currency);
}

export function yearlyPlanTotal(monthlySom: number): number {
  return monthlySom * (12 - YEARLY_BONUS_MONTHS);
}

export function yearlySavings(monthlySom: number): number {
  return monthlySom * YEARLY_BONUS_MONTHS;
}

export function yearlyEquivalentMonthly(monthlySom: number): number {
  return Math.round(yearlyPlanTotal(monthlySom) / 12);
}

export function formatYearlyPrice(
  monthlySom: number,
  currency: PlanCurrency = "USD",
): string {
  return formatSom(yearlyPlanTotal(monthlySom), currency) + "/yil";
}

export function formatYearlyPerMonthEquiv(
  monthlySom: number,
  currency: PlanCurrency = "USD",
): string {
  return `Oyiga ${formatSom(yearlyEquivalentMonthly(monthlySom), currency)}`;
}

export type BillingPeriod = "monthly" | "yearly";

export type PlanMarketingFeature =
  | {
      tier: "limit";
      key: "tables" | "staff" | "products";
      label: string;
    }
  | {
      tier: "all";
      key: string;
      label: string;
    }
  | {
      tier: "plan";
      key: keyof PlanFeatures;
      label: string;
    }
  | {
      tier: "pro-only";
      key: keyof PlanFeatures;
      label: string;
    };

export const PLAN_MARKETING_SECTIONS: {
  title: string;
  features: PlanMarketingFeature[];
}[] = [
  {
    title: "Limitlar",
    features: [
      { tier: "limit", key: "tables", label: "Stollar" },
      { tier: "limit", key: "staff", label: "Xodimlar" },
      { tier: "limit", key: "products", label: "Mahsulotlar" },
    ],
  },
  {
    title: "Barcha tariflarda",
    features: [
      { tier: "all", key: "qr", label: "QR menyu va stol buyurtmasi" },
      { tier: "plan", key: "waiterCall", label: "Mijoz ofitsiant chaqirishi (QR stol)" },
      { tier: "all", key: "cashier", label: "Ovozli kassa va real vaqt sinxron" },
      { tier: "all", key: "kitchen", label: "Oshxona ekrani" },
      { tier: "all", key: "display", label: "TV buyurtma ekrani" },
      { tier: "all", key: "waiter-panel", label: "Ofitsiant paneli" },
      { tier: "all", key: "offline", label: "Offline kassa rejimi" },
      { tier: "all", key: "i18n", label: "3 tilda menyu (O'Z / RU / EN)" },
      { tier: "all", key: "pin", label: "Xodim PIN himoyasi" },
      { tier: "all", key: "tg-menu", label: "Telegram mini-app menyu" },
      { tier: "all", key: "modifiers", label: "Taom variantlari (modifierlar)" },
      { tier: "all", key: "loyalty", label: "Sodiqlik ball tizimi" },
      { tier: "all", key: "receipt", label: "Chek chop etish sozlamalari" },
    ],
  },
  {
    title: "Standard va yuqori",
    features: [
      { tier: "plan", key: "onlineOrders", label: "Onlayn buyurtma (olib ketish / yetkazish)" },
      { tier: "plan", key: "reports", label: "Asosiy savdo hisobotlari" },
      { tier: "plan", key: "dailySalesAnalysis", label: "Kunlik savdo tahlili" },
      { tier: "plan", key: "floorPlan", label: "Vizual zal sxemasi" },
      { tier: "plan", key: "promos", label: "Aksiyalar va chegirmalar" },
      { tier: "plan", key: "telegram", label: "Telegram bot (buyurtma + hisobot)" },
      { tier: "plan", key: "customDashboardTheme", label: "Dashboard rang temasi" },
      { tier: "plan", key: "staffEfficiency", label: "Xodim samaradorligi statistikasi" },
    ],
  },
  {
    title: "Faqat Pro",
    features: [
      { tier: "pro-only", key: "customDomain", label: "Kafe subdomain / o‘z domeni (nomingiz.kafenomi.uz)" },
      { tier: "pro-only", key: "abcAnalysis", label: "ABC mahsulot tahlili" },
      { tier: "pro-only", key: "inventoryRation", label: "Ombor va ratsiya nazorati" },
      { tier: "pro-only", key: "freezerMonitoring", label: "Muzlatgich IoT nazorati" },
      { tier: "pro-only", key: "operationsHub", label: "Operations Hub (smena, chat, IoT)" },
      { tier: "pro-only", key: "multiBranch", label: "Ko'p filial boshqaruvi" },
    ],
  },
];

export function planMarketingFeatureIncluded(
  plan: PlanConfig,
  feature: PlanMarketingFeature
): boolean {
  if (feature.tier === "all" || feature.tier === "limit") return true;
  return plan.features[feature.key];
}

export function planMarketingFeatureValue(
  plan: PlanConfig,
  feature: PlanMarketingFeature
): string | null {
  if (feature.tier !== "limit") return null;
  if (feature.key === "tables") return plan.maxTables >= 999 ? "Cheksiz" : String(plan.maxTables);
  if (feature.key === "staff") return plan.maxStaff >= 999 ? "Cheksiz" : String(plan.maxStaff);
  if (feature.key === "products") return plan.maxProducts >= 999 ? "Cheksiz" : String(plan.maxProducts);
  return null;
}

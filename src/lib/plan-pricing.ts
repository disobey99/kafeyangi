import "server-only";

import { SubscriptionPlan } from "@prisma/client";
import { getPlatformSettings } from "@/lib/platform-settings";
import type { PlanCurrency } from "@/lib/platform-settings-types";
import { calcDiscountedPrice, isPlanDiscountActive } from "@/lib/plan-math";

export type PlanId = SubscriptionPlan;

const FALLBACK_PRICES: Record<PlanId, number> = {
  STARTER: 9,
  STANDARD: 19,
  PRO: 39,
};

export type PlanPricing = {
  planId: PlanId;
  basePriceSom: number;
  priceSom: number;
  discountPercent: number | null;
  discountActive: boolean;
  discountValidFrom: string | null;
  discountValidTo: string | null;
  currency: PlanCurrency;
};

export function getPlanCurrency(): PlanCurrency {
  return getPlatformSettings().planCurrency ?? "USD";
}

export function getPlanBasePriceSom(planId: PlanId): number {
  const settings = getPlatformSettings();
  const fromSettings = settings.planPrices?.[planId];
  if (typeof fromSettings === "number" && fromSettings > 0) return fromSettings;
  return FALLBACK_PRICES[planId] ?? FALLBACK_PRICES.STARTER;
}

export function getPlanPricing(planId: PlanId, now = new Date()): PlanPricing {
  const basePriceSom = getPlanBasePriceSom(planId);
  const settings = getPlatformSettings();
  const discount = settings.planDiscounts?.[planId];
  const discountActive = discount ? isPlanDiscountActive(discount, now) : false;
  const discountPercent =
    discountActive && discount ? Math.round(discount.percent) : null;
  const priceSom =
    discountActive && discountPercent
      ? calcDiscountedPrice(basePriceSom, discountPercent)
      : basePriceSom;

  return {
    planId,
    basePriceSom,
    priceSom,
    discountPercent,
    discountActive,
    discountValidFrom: discount?.validFrom?.trim() || null,
    discountValidTo: discount?.validTo?.trim() || null,
    currency: settings.planCurrency ?? "USD",
  };
}

export function getPlanPriceSom(planId: PlanId): number {
  return getPlanPricing(planId).priceSom;
}

export function getAllPlanPricing(): PlanPricing[] {
  return (["STARTER", "STANDARD", "PRO"] as PlanId[]).map((id) => getPlanPricing(id));
}

export function planIdFromString(value: string): PlanId {
  if (value === "STANDARD" || value === "PRO") return value;
  return SubscriptionPlan.STARTER;
}

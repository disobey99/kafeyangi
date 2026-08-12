"use client";

import { Sparkles, Zap } from "lucide-react";
import {
  formatMonthlyPrice,
  formatSom,
  formatYearlyPerMonthEquiv,
  formatYearlyPrice,
  yearlySavings,
  YEARLY_BONUS_MONTHS,
  type BillingPeriod,
  type PlanCurrency,
} from "@/lib/plans";

export type PlanPricingView = {
  basePriceSom: number;
  priceSom: number;
  discountPercent: number | null;
  discountActive: boolean;
};

export function PlanDiscountBadge({
  percent,
  compact,
}: {
  percent: number;
  compact?: boolean;
}) {
  return (
    <span
      className={`plan-discount-badge ${compact ? "is-compact" : ""}`}
      title={`${percent}% chegirma`}
      aria-label={`${percent} foiz aksiya chegirmasi`}
    >
      <Sparkles className="plan-discount-badge-icon" aria-hidden />
      <span className="plan-discount-badge-text">Aksiya</span>
      <span className="plan-discount-badge-pct">−{percent}%</span>
    </span>
  );
}

export function PlanPriceDisplay({
  pricing,
  period,
  currency = "USD",
  size = "lg",
}: {
  pricing: PlanPricingView;
  period: BillingPeriod;
  currency?: PlanCurrency;
  size?: "lg" | "md";
}) {
  const isYearly = period === "yearly";
  const effective = pricing.priceSom;
  const base = pricing.basePriceSom;
  const hasDiscount = pricing.discountActive && pricing.discountPercent;
  const savedSom = hasDiscount ? base - effective : 0;

  const oldPriceLabel = isYearly
    ? formatYearlyPrice(base, currency)
    : formatMonthlyPrice(base, currency);
  const mainPriceLabel = isYearly
    ? formatYearlyPrice(effective, currency)
    : formatMonthlyPrice(effective, currency);

  return (
    <div className={`plan-price-block ${size === "md" ? "is-md" : "is-lg"}`}>
      {hasDiscount && pricing.discountPercent != null && (
        <div className="plan-promo-strip">
          <PlanDiscountBadge percent={pricing.discountPercent} compact={size === "md"} />
          <span className="plan-old-price">{oldPriceLabel}</span>
        </div>
      )}

      <p className="plan-price-main">{mainPriceLabel}</p>

      {hasDiscount && savedSom > 0 && !isYearly && (
        <p className="plan-saved-note">
          Oyiga {formatSom(savedSom, currency)} tejaysiz
        </p>
      )}

      {isYearly ? (
        <>
          <p className="plan-price-equiv">
            {formatYearlyPerMonthEquiv(effective, currency)}
          </p>
          <p className="plan-yearly-bonus">
            <Zap className="h-3.5 w-3.5" aria-hidden />
            {formatSom(yearlySavings(effective), currency)} tejaysiz ·{" "}
            {YEARLY_BONUS_MONTHS} oy bepul
          </p>
        </>
      ) : (
        size === "lg" && (
          <p className="plan-price-sub">Har oy, istalgan vaqtda bekor qilish</p>
        )
      )}
    </div>
  );
}

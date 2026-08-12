"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Sparkles, X, Zap } from "lucide-react";
import {
  PLAN_MARKETING_SECTIONS,
  YEARLY_BONUS_MONTHS,
  planMarketingFeatureIncluded,
  planMarketingFeatureValue,
  type BillingPeriod,
  type PlanConfig,
  type PlanCurrency,
  type PlanMarketingFeature,
} from "@/lib/plans";
import { PlanPriceDisplay } from "@/components/plan-price-display";

type ApiPlan = PlanConfig & {
  basePriceSom: number;
  discountPercent: number | null;
  discountActive: boolean;
};

function FeatureRow({
  feature,
  plan,
  compact,
}: {
  feature: PlanMarketingFeature;
  plan: PlanConfig;
  compact?: boolean;
}) {
  const included = planMarketingFeatureIncluded(plan, feature);
  const value = planMarketingFeatureValue(plan, feature);

  return (
    <li
      className={`flex items-start gap-2 ${compact ? "text-xs" : "text-sm"} ${
        included ? "text-[var(--foreground)]" : "text-[var(--muted)] opacity-55"
      }`}
    >
      {included ? (
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
          <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
        </span>
      ) : (
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-stone-500/10">
          <X className="h-2.5 w-2.5 text-[var(--muted)]" strokeWidth={2.5} />
        </span>
      )}
      <span>
        {feature.label}
        {value != null && (
          <span className="ml-1 font-semibold text-[var(--brand)]">· {value}</span>
        )}
      </span>
    </li>
  );
}

function PlanCard({
  plan,
  period,
  currency,
  highlighted,
}: {
  plan: ApiPlan;
  period: BillingPeriod;
  currency: PlanCurrency;
  highlighted: boolean;
}) {
  return (
    <article
      className={`pricing-card relative flex flex-col overflow-hidden rounded-2xl border p-7 transition-all duration-300 md:p-8 ${
        highlighted
          ? "pricing-card-featured border-[var(--brand)] shadow-[var(--shadow-brand)] md:scale-[1.03]"
          : "border-[var(--border)] bg-[var(--surface-elevated)]"
      }`}
    >
      {highlighted && (
        <>
          <div className="pricing-card-shine pointer-events-none absolute inset-0" />
          <div className="absolute right-4 top-4 z-10">
            <span className="badge badge-brand gap-1">
              <Sparkles className="h-3 w-3" />
              Mashhur
            </span>
          </div>
        </>
      )}

      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand)]">
          {plan.id === "STARTER" ? "Boshlang'ich" : plan.id === "STANDARD" ? "O'sish" : "Tarmoq"}
        </p>
        <h3 className="mt-1 text-2xl font-extrabold tracking-tight">{plan.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{plan.description}</p>
      </div>

      <div className="relative mt-6 border-b border-[var(--border)] pb-6">
        <PlanPriceDisplay
          period={period}
          currency={currency}
          size="lg"
          pricing={{
            basePriceSom: plan.basePriceSom,
            priceSom: plan.priceSom,
            discountPercent: plan.discountPercent,
            discountActive: plan.discountActive,
          }}
        />
      </div>

      <div className="relative mt-6 flex-1 space-y-5">
        {PLAN_MARKETING_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              {section.title}
            </p>
            <ul className="space-y-2">
              {section.features.map((feat) => (
                <FeatureRow
                  key={`${section.title}-${feat.tier === "limit" || feat.tier === "plan" || feat.tier === "pro-only" ? feat.key : feat.key}`}
                  feature={feat}
                  plan={plan}
                  compact={section.title === "Barcha tariflarda"}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Link
        href="/register"
        className={`btn relative mt-8 w-full py-3 ${highlighted ? "btn-primary" : "btn-secondary"}`}
      >
        14 kun bepul sinov
      </Link>
      <p className="relative mt-3 text-center text-[11px] leading-relaxed text-[var(--muted)]">
        Narxlar soliqlarsiz ko&apos;rsatilgan. Yakuniy soliq (QQS) to&apos;lov
        vaqtida siz yashayotgan davlat qonunchiligiga ko&apos;ra hisoblanadi.
      </p>
    </article>
  );
}

export function PricingSection() {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [currency, setCurrency] = useState<PlanCurrency>("USD");

  useEffect(() => {
    void fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => {
        setPlans(d.plans ?? []);
        if (d.currency === "UZS" || d.currency === "USD") setCurrency(d.currency);
      })
      .catch(() => setPlans([]));
  }, []);

  const ordered = ["STARTER", "STANDARD", "PRO"]
    .map((id) => plans.find((p) => p.id === id))
    .filter(Boolean) as ApiPlan[];

  return (
    <section id="pricing" className="pricing-section relative overflow-hidden border-t border-[var(--border)] px-6 py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-[var(--brand)] opacity-[0.06] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <span className="badge badge-brand">
            <Sparkles className="h-3 w-3" />
            Tariflar
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">
            O&apos;zingizga mos rejani tanlang
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--muted)]">
            Yashirin to&apos;lov yo&apos;q · 14 kun bepul sinov · istalgan vaqtda tarifni o&apos;zgartirish
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <div
            className="pricing-toggle inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 shadow-sm"
            role="tablist"
            aria-label="To'lov davri"
          >
            <button
              type="button"
              role="tab"
              aria-selected={period === "monthly"}
              className={period === "monthly" ? "pricing-toggle-active" : "pricing-toggle-item"}
              onClick={() => setPeriod("monthly")}
            >
              Oylik
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={period === "yearly"}
              className={period === "yearly" ? "pricing-toggle-active" : "pricing-toggle-item"}
              onClick={() => setPeriod("yearly")}
            >
              Yillik
              <span className="pricing-toggle-bonus">+{YEARLY_BONUS_MONTHS} oy bepul</span>
            </button>
          </div>
          {period === "yearly" && (
            <p className="text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Yillik to&apos;lovda {YEARLY_BONUS_MONTHS} oy bonus — 12 oy uchun faqat 10 oylik narx
            </p>
          )}
        </div>

        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3 lg:gap-5">
          {ordered.length === 0 ? (
            <p className="col-span-full text-center text-[var(--muted)]">Tariflar yuklanmoqda…</p>
          ) : (
            ordered.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                period={period}
                currency={currency}
                highlighted={i === 1}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

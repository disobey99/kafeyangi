"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Check,
  CreditCard,
  Crown,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  PLAN_MARKETING_SECTIONS,
  YEARLY_BONUS_MONTHS,
  getPlanConfig,
  planMarketingFeatureIncluded,
  planMarketingFeatureValue,
  type BillingPeriod,
  type PlanConfig,
  type PlanCurrency,
  type PlanId,
  type PlanMarketingFeature,
} from "@/lib/plans";
import { PlanPriceDisplay } from "@/components/plan-price-display";
import { openPaddleCheckout } from "@/lib/paddle-client";

type PlanInfo = {
  id: string;
  name: string;
  priceLabel: string;
  basePriceLabel?: string;
  priceSom: number;
  basePriceSom: number;
  discountPercent: number | null;
  discountActive: boolean;
  discountValidTo?: string | null;
  description: string;
  maxTables: number;
  maxStaff: number;
  maxProducts: number;
  features: Record<string, boolean>;
  current: boolean;
};

type SubData = {
  plan: string;
  planName: string;
  status: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  currency?: PlanCurrency;
  subscriptionActive: boolean;
  subscriptionReason: string | null;
  usage: { tables: number; staff: number; products: number };
  limits: { maxTables: number; maxStaff: number; maxProducts: number };
  plans: PlanInfo[];
};

type Invoice = {
  id: string;
  plan: string;
  amountLabel: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  statusLabel: string;
};

const PLAN_ORDER: PlanId[] = ["STARTER", "STANDARD", "PRO"];

const PLAN_TAGLINE: Record<PlanId, string> = {
  STARTER: "Boshlang'ich",
  STANDARD: "O'sish",
  PRO: "Tarmoq",
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
      className={`flex items-start gap-2 ${compact ? "text-[11px] leading-snug" : "text-xs leading-snug"} ${
        included ? "text-[var(--dp-text)]" : "text-[var(--dp-muted)] opacity-50"
      }`}
    >
      {included ? (
        <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
          <Check className="h-2 w-2 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
        </span>
      ) : (
        <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[var(--dp-border-subtle)]">
          <X className="h-2 w-2 text-[var(--dp-muted)]" strokeWidth={2.5} />
        </span>
      )}
      <span>
        {feature.label}
        {value != null && (
          <span className="ml-1 font-semibold text-[var(--dp-accent)]">· {value}</span>
        )}
      </span>
    </li>
  );
}

function SubPlanCard({
  plan,
  pricing,
  period,
  currency,
  isCurrent,
  onSubscribe,
  subscribing,
  paddleReady,
}: {
  plan: PlanConfig;
  pricing: {
    basePriceSom: number;
    priceSom: number;
    discountPercent: number | null;
    discountActive: boolean;
  };
  period: BillingPeriod;
  currency: PlanCurrency;
  isCurrent: boolean;
  onSubscribe: (planId: PlanId) => void;
  subscribing: boolean;
  paddleReady: boolean;
}) {
  const isPro = plan.id === "PRO";

  return (
    <article
      className={`dp-card relative flex flex-col overflow-hidden rounded-2xl p-5 transition-all duration-300 ${
        isCurrent
          ? "z-[1] scale-[1.02] bg-[var(--dp-accent-soft)] shadow-[0_12px_36px_rgba(245,158,11,0.22)] ring-2 ring-[var(--dp-accent)]"
          : "opacity-90 hover:opacity-100"
      }`}
    >
      {isCurrent && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[var(--dp-accent)]"
            aria-hidden
          />
          <div className="absolute right-3 top-3 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--dp-accent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              <Sparkles className="h-3 w-3" aria-hidden />
              Sizning tarifingiz
            </span>
          </div>
        </>
      )}
      {isPro && !isCurrent && (
        <div className="absolute right-3 top-3">
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--dp-accent)] bg-[var(--dp-accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--dp-accent)]">
            <Crown className="h-3 w-3" />
            Pro
          </span>
        </div>
      )}

      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--dp-accent)]">
        {PLAN_TAGLINE[plan.id]}
      </p>
      <h3 className="mt-0.5 text-xl font-extrabold text-[var(--dp-text)]">
        {plan.name}
      </h3>
      {isCurrent ? (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--dp-accent)]">
          <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} aria-hidden />
          Hozir shu tarifda ishlayapsiz
        </p>
      ) : (
        <p className="mt-1 text-xs text-[var(--dp-muted)]">{plan.description}</p>
      )}

      <div className="mt-4 border-b border-[var(--dp-border-subtle)] pb-4">
        <PlanPriceDisplay
          period={period}
          currency={currency}
          size="md"
          pricing={pricing}
        />
      </div>

      <div className="mt-4 flex-1 space-y-3">
        {PLAN_MARKETING_SECTIONS.map((section) => {
          const isUniversal = section.title === "Barcha tariflarda";
          const body = (
            <ul className="mt-1.5 space-y-1.5">
              {section.features.map((feat) => (
                <FeatureRow
                  key={`${section.title}-${feat.tier === "limit" || feat.tier === "plan" || feat.tier === "pro-only" ? feat.key : feat.key}`}
                  feature={feat}
                  plan={plan}
                  compact={isUniversal}
                />
              ))}
            </ul>
          );

          if (isUniversal) {
            return (
              <details key={section.title} className="group">
                <summary className="cursor-pointer list-none text-[10px] font-bold uppercase tracking-widest text-[var(--dp-muted)] [&::-webkit-details-marker]:hidden">
                  {section.title} ({section.features.length})
                  <span className="ml-1 opacity-60 group-open:hidden">▾</span>
                  <span className="ml-1 hidden opacity-60 group-open:inline">▴</span>
                </summary>
                {body}
              </details>
            );
          }

          return (
            <div key={section.title}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--dp-muted)]">
                {section.title}
              </p>
              {body}
            </div>
          );
        })}
      </div>

      {paddleReady && (
        <>
          <button
            type="button"
            disabled={subscribing}
            onClick={() => onSubscribe(plan.id)}
            className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
              isCurrent
                ? "border border-[var(--dp-accent)] bg-white/70 text-[var(--dp-accent)] hover:bg-white dark:bg-black/20"
                : "btn btn-primary"
            }`}
          >
            {subscribing ? (
              "Ochilmoqda..."
            ) : (
              <>
                <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
                {isCurrent ? "Obunani uzaytirish" : "Obuna bo'lish"}
              </>
            )}
          </button>
          <p className="mt-3 text-center text-[10px] leading-relaxed text-[var(--dp-muted)]">
            Narxlar soliqlarsiz ko&apos;rsatilgan. Yakuniy soliq (QQS) to&apos;lov
            vaqtida siz yashayotgan davlat qonunchiligiga ko&apos;ra hisoblanadi.
          </p>
        </>
      )}
    </article>
  );
}

export function SubscriptionPanel({ cafeId }: { cafeId: string }) {
  const [data, setData] = useState<SubData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [subscribingPlan, setSubscribingPlan] = useState<PlanId | null>(null);
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [paddleReady, setPaddleReady] = useState(false);
  const [payError, setPayError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [subRes, billRes] = await Promise.all([
      fetch(`/api/cafes/${cafeId}/subscription`),
      fetch(`/api/cafes/${cafeId}/billing`),
    ]);
    const json = await subRes.json();
    const billJson = await billRes.json();
    setData(json);
    setInvoices(billJson.invoices ?? []);
    setPaddleReady(Boolean(billJson.paddleEnabled));
    setLoading(false);
  }, [cafeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function startPaddleCheckout(opts: {
    plan?: PlanId;
    invoiceId?: string;
  }) {
    setPayError("");
    if (opts.plan) setSubscribingPlan(opts.plan);
    if (opts.invoiceId) setPayingId(opts.invoiceId);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/billing/paddle-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: opts.plan,
          period,
          invoiceId: opts.invoiceId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPayError(json.error || "To'lov ochilmadi");
        return;
      }
      await openPaddleCheckout({
        token: json.clientToken,
        env: json.env,
        transactionId: json.transactionId,
      });
      // Webhook kelguncha biroz kutib yangilaymiz
      setTimeout(() => void load(), 4000);
    } catch {
      setPayError("To'lov oynasi ochilmadi — internetni tekshiring");
    } finally {
      setSubscribingPlan(null);
      setPayingId(null);
    }
  }

  async function payInvoice(invoiceId: string) {
    if (paddleReady) {
      await startPaddleCheckout({ invoiceId });
      return;
    }
    setPayingId(invoiceId);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/billing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      if (res.ok) load();
    } finally {
      setPayingId(null);
    }
  }

  async function cancelPendingInvoice(invoiceId: string) {
    if (!confirm("Bu kutilayotgan to'lovni bekor qilasizmi?")) return;
    setCancellingId(invoiceId);
    setPayError("");
    try {
      const res = await fetch(`/api/cafes/${cafeId}/billing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, action: "cancel" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayError(json.error ?? "Bekor qilib bo'lmadi");
        return;
      }
      await load();
    } catch {
      setPayError("Tarmoq xatosi");
    } finally {
      setCancellingId(null);
    }
  }

  if (loading || !data) {
    return (
      <div className="dp-card rounded-2xl p-10 text-center text-sm text-[var(--dp-muted)]">
        Yuklanmoqda...
      </div>
    );
  }

  const statusLabel =
    data.status === "TRIAL"
      ? "Sinov davri"
      : data.status === "ACTIVE"
        ? "Faol obuna"
        : data.status;

  return (
    <div className="space-y-6">
      {!data.subscriptionActive && (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "rgba(239, 68, 68, 0.35)",
            background: "rgba(239, 68, 68, 0.08)",
            color: "var(--dp-text)",
          }}
        >
          <p className="font-semibold">Obuna faol emas</p>
          <p className="mt-0.5 text-[var(--dp-muted)]">{data.subscriptionReason}</p>
        </div>
      )}

      <div className="dp-card overflow-hidden rounded-2xl border-t-[3px] border-t-[var(--dp-accent)]">
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--dp-accent)]">
              Joriy tarif
            </p>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-[var(--dp-text)]">
              {data.planName}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill label={statusLabel} variant="accent" />
              {data.subscriptionActive && (
                <StatusPill label="Ishlayapti" variant="success" />
              )}
            </div>
            {data.trialEndsAt && data.status === "TRIAL" && (
              <p className="mt-3 text-sm text-[var(--dp-muted)]">
                Sinov tugashi:{" "}
                <strong className="text-[var(--dp-text)]">
                  {new Date(data.trialEndsAt).toLocaleDateString("uz-UZ")}
                </strong>
              </p>
            )}
            {data.subscriptionEndsAt && data.status === "ACTIVE" && (
              <p className="mt-3 text-sm text-[var(--dp-muted)]">
                Obuna tugashi:{" "}
                <strong className="text-[var(--dp-text)]">
                  {new Date(data.subscriptionEndsAt).toLocaleDateString("uz-UZ")}
                </strong>
              </p>
            )}
          </div>
          <Link
            href="/#pricing"
            className="btn btn-secondary text-sm"
            target="_blank"
          >
            <Sparkles className="h-4 w-4" />
            Saytdagi tariflar
          </Link>
        </div>

        <div className="grid gap-3 border-t border-[var(--dp-border-subtle)] bg-[var(--dp-card-header)] p-4 sm:grid-cols-3">
          <UsageBar label="Stollar" used={data.usage.tables} max={data.limits.maxTables} icon={CreditCard} />
          <UsageBar label="Xodimlar" used={data.usage.staff} max={data.limits.maxStaff} />
          <UsageBar label="Mahsulotlar" used={data.usage.products} max={data.limits.maxProducts} />
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-bold text-[var(--dp-text)]">Barcha tariflar</h3>
          <p className="text-sm text-[var(--dp-muted)]">
            Imkoniyatlarni solishtiring va keyingroq yangilang
          </p>
        </div>
        <div
          className="pricing-toggle inline-flex rounded-full border border-[var(--dp-border)] bg-[var(--dp-card)] p-1"
          role="tablist"
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
            <span className="pricing-toggle-bonus">+{YEARLY_BONUS_MONTHS} oy</span>
          </button>
        </div>
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = getPlanConfig(id);
          const apiPlan = data.plans.find((p) => p.id === id);
          const pricing = {
            basePriceSom: apiPlan?.basePriceSom ?? plan.priceSom,
            priceSom: apiPlan?.priceSom ?? plan.priceSom,
            discountPercent: apiPlan?.discountPercent ?? null,
            discountActive: apiPlan?.discountActive ?? false,
          };
          return (
            <SubPlanCard
              key={id}
              plan={plan}
              pricing={pricing}
              period={period}
              currency={data.currency === "UZS" ? "UZS" : "USD"}
              isCurrent={apiPlan?.current ?? data.plan === id}
              paddleReady={paddleReady}
              subscribing={subscribingPlan === id}
              onSubscribe={(planId) => void startPaddleCheckout({ plan: planId })}
            />
          );
        })}
      </div>

      {payError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {payError}
        </p>
      )}

      {invoices.length > 0 && (
        <section className="dp-card overflow-hidden rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[var(--dp-text)]">Hisob-fakturalar</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-[var(--dp-border-subtle)] text-left text-[var(--dp-muted)]">
                  <th className="pb-2 font-semibold">Davr</th>
                  <th className="pb-2 font-semibold">Summa</th>
                  <th className="pb-2 font-semibold">Holat</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[var(--dp-border-subtle)] last:border-0">
                    <td className="py-3 text-[var(--dp-text)]">
                      {new Date(inv.periodStart).toLocaleDateString("uz-UZ")} —{" "}
                      {new Date(inv.periodEnd).toLocaleDateString("uz-UZ")}
                    </td>
                    <td className="py-3 font-semibold text-[var(--dp-text)]">{inv.amountLabel}</td>
                    <td className="py-3 text-[var(--dp-muted)]">{inv.statusLabel}</td>
                    <td className="py-3 text-right">
                      {(inv.status === "PENDING" || inv.status === "OVERDUE") && (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={payingId === inv.id || cancellingId === inv.id}
                            onClick={() => void payInvoice(inv.id)}
                            className="btn btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-50"
                          >
                            {payingId === inv.id ? (
                              "..."
                            ) : (
                              <>
                                <CreditCard className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                To'lov qilish
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={payingId === inv.id || cancellingId === inv.id}
                            onClick={() => void cancelPendingInvoice(inv.id)}
                            className="rounded-lg border border-[var(--dp-border)] px-3 py-1.5 text-xs font-semibold text-[var(--dp-muted)] hover:bg-[var(--dp-card-header)] disabled:opacity-50"
                          >
                            {cancellingId === inv.id ? "..." : "Bekor qilish"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="rounded-xl border border-[var(--dp-border-subtle)] bg-[var(--dp-card-header)] px-4 py-3 text-sm text-[var(--dp-muted)]">
        {paddleReady
          ? "To'lov xalqaro kartalar orqali qabul qilinadi. Muvaffaqiyatli to'lovdan keyin obuna avtomatik faollashadi."
          : "Onlayn to'lov hali sozlanmagan. Platforma admin to'lov kalitlarini qo'shgach, bu yerda to'lov tugmalari paydo bo'ladi."}
      </p>
    </div>
  );
}

function StatusPill({
  label,
  variant,
}: {
  label: string;
  variant: "accent" | "success";
}) {
  const styles =
    variant === "accent"
      ? "border-[var(--dp-accent)] bg-[var(--dp-accent-soft)] text-[var(--dp-accent)]"
      : "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";

  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {label}
    </span>
  );
}

function UsageBar({
  label,
  used,
  max,
  icon: Icon,
}: {
  label: string;
  used: number;
  max: number;
  icon?: LucideIcon;
}) {
  const unlimited = max >= 999;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / max) * 100));
  const high = pct >= 90;

  return (
    <div className="rounded-xl border border-[var(--dp-border-subtle)] bg-[var(--dp-card)] px-4 py-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-medium text-[var(--dp-subtle)]">
          {Icon && <Icon className="h-3.5 w-3.5 text-[var(--dp-muted)]" />}
          {label}
        </span>
        <span className="font-bold text-[var(--dp-text)]">
          {used}
          <span className="font-normal text-[var(--dp-muted)]">
            {" "}/ {unlimited ? "∞" : max}
          </span>
        </span>
      </div>
      {!unlimited && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--dp-border-subtle)]">
          <div
            className={`h-full rounded-full transition-all ${
              high ? "bg-red-500" : "bg-[var(--dp-accent)]"
            }`}
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
      )}
    </div>
  );
}

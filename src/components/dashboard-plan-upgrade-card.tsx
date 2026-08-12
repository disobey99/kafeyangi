"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Crown, Sparkles } from "lucide-react";
import { planLabel, type PlanId } from "@/lib/plans";

type SubSummary = {
  plan: PlanId;
  planName: string;
  status: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  subscriptionActive: boolean;
};

const PLAN_HINT: Record<PlanId, string> = {
  STARTER: "QR menyu · 15 stol",
  STANDARD: "Hisobotlar · Zal sxemasi",
  PRO: "Operations Hub · Filiallar",
};

const NEXT_PLAN: Partial<Record<PlanId, PlanId>> = {
  STARTER: "STANDARD",
  STANDARD: "PRO",
};

function daysLeft(until: string | null): number | null {
  if (!until) return null;
  const end = new Date(until);
  if (Number.isNaN(end.getTime())) return null;
  return Math.ceil((end.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function planGradient(plan: PlanId) {
  if (plan === "PRO") {
    return "linear-gradient(135deg, #0e7d74 0%, #16a398 55%, #12958b 100%)";
  }
  if (plan === "STANDARD") {
    return "linear-gradient(135deg, #16a398 0%, #0e7d74 100%)";
  }
  return "linear-gradient(135deg, #2dd4bf 0%, #16a398 100%)";
}

export function DashboardPlanUpgradeCard({
  cafeId,
  compact = false,
}: {
  cafeId: string;
  compact?: boolean;
}) {
  const [data, setData] = useState<SubSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cafes/${cafeId}/subscription`);
        const json = (await res.json()) as SubSummary & { error?: string };
        if (!cancelled && res.ok) setData(json);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cafeId]);

  if (compact) {
    return (
      <Link
        href={`/dashboard/${cafeId}/subscription`}
        className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#16A398] to-[#0E7D74] text-white shadow-md transition hover:scale-105"
        title={data ? `${data.planName} tarif` : "Tarif"}
      >
        <Crown className="h-4 w-4" strokeWidth={2.25} />
      </Link>
    );
  }

  if (loading) {
    return (
      <div
        className="animate-pulse rounded-xl p-3"
        style={{ background: "var(--dp-nav-hover)" }}
      >
        <div className="h-2.5 w-20 rounded bg-[var(--dp-border)]" />
        <div className="mt-2 h-2 w-full rounded bg-[var(--dp-border)]" />
        <div className="mt-2.5 h-7 rounded-lg bg-[var(--dp-border)]" />
      </div>
    );
  }

  if (!data) return null;

  const plan = data.plan;
  const nextPlan = NEXT_PLAN[plan];
  const isTrial = data.status === "TRIAL";
  const trialDays = daysLeft(data.trialEndsAt);
  const subDays = daysLeft(data.subscriptionEndsAt);
  const href = `/dashboard/${cafeId}/subscription`;

  const ctaLabel = nextPlan ? `${planLabel(nextPlan)}ga` : "Boshqarish";

  const statusLine = isTrial
    ? trialDays != null && trialDays > 0
      ? `${trialDays} kun`
      : "Tugagan"
    : data.status === "ACTIVE" && subDays != null && subDays > 0
      ? `${subDays} kun`
      : !data.subscriptionActive
        ? "Faol emas"
        : null;

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-xl p-3 text-white shadow-md transition hover:brightness-105"
      style={{ background: planGradient(plan) }}
    >
      <div className="relative flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
          {plan === "PRO" ? (
            <Crown className="h-3.5 w-3.5" strokeWidth={2.25} />
          ) : (
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-bold leading-tight">{data.planName}</p>
            {statusLine && (
              <span className="shrink-0 rounded-md bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                {isTrial ? `Sinov ${statusLine}` : statusLine}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[10px] text-white/80">{PLAN_HINT[plan]}</p>
        </div>
        <span className="flex shrink-0 items-center gap-0.5 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-bold text-[#0E7D74] shadow-sm transition group-hover:bg-white">
          {ctaLabel}
          <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
        </span>
      </div>
    </Link>
  );
}

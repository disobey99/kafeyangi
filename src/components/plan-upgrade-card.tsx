import Link from "next/link";
import {
  ArrowRight,
  Check,
  Lock,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  getPlanFeatureMarketing,
  planNameForMin,
} from "@/lib/plan-feature-marketing";
import type { PlanFeatures } from "@/lib/plans";

export function PlanUpgradeCard({
  feature,
  currentPlan,
  cafeId,
}: {
  feature: keyof PlanFeatures;
  currentPlan?: string;
  cafeId?: string;
}) {
  const m = getPlanFeatureMarketing(feature);
  const target = planNameForMin(m.minPlan);
  const subHref = cafeId
    ? `/dashboard/${cafeId}/subscription`
    : "/#pricing";

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-[var(--dp-border)] bg-[var(--dp-card)] shadow-[var(--dp-shadow)]">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#16A398]/15 via-[var(--dp-accent-soft)] to-[#0E7D74]/10 px-6 pb-6 pt-8 sm:px-10">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[var(--dp-accent)]/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--dp-accent)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
            <Lock className="h-3 w-3" aria-hidden />
            {m.minPlan === "PRO" ? "Pro imkoniyat" : "Standard+ imkoniyat"}
          </span>
          {currentPlan && (
            <span className="rounded-full border border-[var(--dp-border)] bg-[var(--dp-card)]/80 px-2.5 py-1 text-[11px] font-medium text-[var(--dp-muted)]">
              Joriy: {currentPlan}
            </span>
          )}
        </div>
        <h1 className="relative mt-4 text-2xl font-extrabold tracking-tight text-[var(--dp-text)] sm:text-3xl">
          {m.title}
        </h1>
        <p className="relative mt-3 max-w-xl text-base font-medium leading-relaxed text-[var(--dp-subtle)]">
          {m.hook}
        </p>
      </div>

      <div className="space-y-6 px-6 py-7 sm:px-10">
        <ul className="space-y-3">
          {m.benefits.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm text-[var(--dp-text)]">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-2xl border border-[#16A398]/25 bg-[#16A398]/8 px-4 py-3.5">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-[var(--dp-subtle)]">
            <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dp-accent)]" aria-hidden />
            <span>
              <span className="font-semibold text-[var(--dp-text)]">Misolda: </span>
              {m.scenario}
            </span>
          </p>
        </div>

        <p className="text-center text-sm text-[var(--dp-muted)]">
          Bu funksiya{" "}
          <span className="font-bold text-[var(--dp-accent)]">{target}</span>{" "}
          tarifida ochiladi. Hozirgi ishingizni to&apos;xtatmasdan, keyinroq
          yangilashingiz mumkin.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={subHref}
            className="btn btn-primary inline-flex items-center gap-2 px-5"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {target} tarifga o&apos;tish
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          {cafeId ? (
            <Link href={`/dashboard/${cafeId}`} className="btn btn-secondary">
              Bosh sahifa
            </Link>
          ) : (
            <Link href="/dashboard" className="btn btn-secondary">
              Bosh sahifa
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import {
  featuresLockedForPlan,
  getPlanFeatureMarketing,
  planNameForMin,
  type PlanFeatureMarketing,
} from "@/lib/plan-feature-marketing";
import type { PlanFeatures, PlanId } from "@/lib/plans";

const STORAGE_DISMISS = "kafe:upsell-dismiss";
const FIRST_DELAY_MS = 45_000;
const INTERVAL_MS = 12 * 60_000;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

type SubPayload = {
  plan: PlanId;
  planName: string;
  features?: PlanFeatures;
};

function readDismissMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_DISMISS);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDismiss(feature: string) {
  try {
    const map = readDismissMap();
    map[feature] = Date.now();
    localStorage.setItem(STORAGE_DISMISS, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function isCoolingDown(feature: string): boolean {
  const ts = readDismissMap()[feature];
  if (!ts) return false;
  return Date.now() - ts < COOLDOWN_MS;
}

export function PlanUpsellPopup({ cafeId }: { cafeId: string }) {
  const pathname = usePathname();
  const [locked, setLocked] = useState<(keyof PlanFeatures)[]>([]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);

  const onSubscriptionPage = Boolean(pathname?.includes("/subscription"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/cafes/${cafeId}/subscription`);
        if (!res.ok) return;
        const json = (await res.json()) as SubPayload;
        if (cancelled || !json.features) return;
        setLocked(featuresLockedForPlan(json.features));
        setReady(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cafeId]);

  const showNext = useCallback(() => {
    if (onSubscriptionPage) return;
    const list = locked.filter((f) => !isCoolingDown(f));
    if (list.length === 0) return;
    setIndex((i) => (i + 1) % list.length);
    setOpen(true);
  }, [locked, onSubscriptionPage]);

  useEffect(() => {
    if (!ready || locked.length === 0 || onSubscriptionPage) return;

    const first = window.setTimeout(showNext, FIRST_DELAY_MS);
    const interval = window.setInterval(showNext, INTERVAL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [ready, locked.length, onSubscriptionPage, showNext]);

  const eligible = locked.filter((f) => !isCoolingDown(f));
  if (!open || onSubscriptionPage || eligible.length === 0) return null;

  const feature = eligible[index % eligible.length];
  const m: PlanFeatureMarketing = getPlanFeatureMarketing(feature);
  const target = planNameForMin(m.minPlan);

  function dismiss(remember: boolean) {
    if (remember) writeDismiss(feature);
    setOpen(false);
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-end p-4 sm:p-6"
      role="dialog"
      aria-label="Tarif imkoniyati taklifi"
    >
      <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--dp-border)] bg-[var(--dp-card)] shadow-[0_20px_50px_rgba(28,25,23,0.22)]">
        <div className="relative bg-gradient-to-br from-[#16A398]/20 via-[var(--dp-accent-soft)] to-transparent px-4 pb-3 pt-4">
          <button
            type="button"
            onClick={() => dismiss(true)}
            className="absolute right-2 top-2 rounded-lg p-1.5 text-[var(--dp-muted)] hover:bg-[var(--dp-card-header)]"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--dp-accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            <Sparkles className="h-3 w-3" aria-hidden />
            {target} da ochiladi
          </span>
          <h3 className="mt-2 pr-8 text-base font-extrabold leading-snug text-[var(--dp-text)]">
            {m.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--dp-subtle)]">
            {m.hook}
          </p>
        </div>
        <div className="space-y-3 px-4 py-3.5">
          <p className="text-xs leading-relaxed text-[var(--dp-muted)]">
            <span className="font-semibold text-[var(--dp-text)]">Masalan: </span>
            {m.scenario}
          </p>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/${cafeId}/subscription`}
              onClick={() => dismiss(true)}
              className="btn btn-primary inline-flex flex-1 items-center justify-center gap-1.5 py-2 text-sm"
            >
              Tarifni ko&apos;rish
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => dismiss(true)}
              className="rounded-xl border border-[var(--dp-border)] px-3 py-2 text-xs font-semibold text-[var(--dp-muted)] hover:bg-[var(--dp-card-header)]"
            >
              Keyinroq
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

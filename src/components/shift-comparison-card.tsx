"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

type ShiftData = {
  today: {
    label: string;
    orderCount: number;
    revenue: number;
    fastestPrepSec: number | null;
  };
  yesterday: {
    label: string;
    orderCount: number;
    revenue: number;
    fastestPrepSec: number | null;
  };
  change: {
    orderCount: number;
    revenue: number;
    fastestPrepSec: number | null;
  };
};

function formatPrep(sec: number | null) {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function ChangeBadge({ value, invert = false }: { value: number; invert?: boolean }) {
  const good = invert ? value < 0 : value > 0;
  const bad = invert ? value > 0 : value < 0;
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-[var(--dp-muted)]">
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        good ? "text-emerald-600" : bad ? "text-red-600" : "text-[var(--dp-muted)]"
      }`}
    >
      {value > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {value > 0 ? "+" : ""}
      {value}%
    </span>
  );
}

export function ShiftComparisonCard({ cafeId }: { cafeId: string }) {
  const [data, setData] = useState<ShiftData | null>(null);

  useEffect(() => {
    fetch(`/api/cafes/${cafeId}/shift-comparison`)
      .then((r) => r.json())
      .then(setData);
  }, [cafeId]);

  if (!data) {
    return (
      <div className="reports-block rounded-xl p-6">
        <p className="text-sm text-[var(--dp-muted)]">Smena taqqoslash yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="reports-block rounded-xl p-6">
      <h2 className="text-lg font-bold text-[var(--dp-text)]">Smena taqqoslash</h2>
      <p className="mt-1 text-sm text-[var(--dp-muted)]">Bugun vs kecha</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Savdo"
          today={formatPrice(data.today.revenue)}
          yesterday={formatPrice(data.yesterday.revenue)}
          change={<ChangeBadge value={data.change.revenue} />}
        />
        <MetricCard
          label="Buyurtmalar"
          today={String(data.today.orderCount)}
          yesterday={String(data.yesterday.orderCount)}
          change={<ChangeBadge value={data.change.orderCount} />}
        />
        <MetricCard
          label="Eng tez tayyorlash"
          today={formatPrep(data.today.fastestPrepSec)}
          yesterday={formatPrep(data.yesterday.fastestPrepSec)}
          change={
            data.change.fastestPrepSec != null ? (
              <span
                className={`text-xs font-semibold ${
                  data.change.fastestPrepSec < 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {data.change.fastestPrepSec < 0 ? "Tezroq" : "Sekinroq"}{" "}
                {Math.abs(data.change.fastestPrepSec)}s
              </span>
            ) : (
              <span className="text-xs text-[var(--dp-muted)]">—</span>
            )
          }
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  today,
  yesterday,
  change,
}: {
  label: string;
  today: string;
  yesterday: string;
  change: React.ReactNode;
}) {
  return (
    <div className="reports-block rounded-lg p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--dp-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[var(--dp-text)]">{today}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-[var(--dp-muted)]">Kecha: {yesterday}</p>
        {change}
      </div>
    </div>
  );
}

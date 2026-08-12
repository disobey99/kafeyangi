"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShiftComparisonCard } from "@/components/shift-comparison-card";
import { formatPrice } from "@/lib/utils";

type ReportPeriod = "day" | "week" | "month" | "custom";

type ReportData = {
  period: string;
  from?: string;
  to?: string;
  summary: {
    totalRevenue: number;
    totalDiscount: number;
    cashRevenue: number;
    cardRevenue: number;
    paymeRevenue?: number;
    otherRevenue?: number;
    orderCount: number;
    avgCheck: number;
    peakHour: number | null;
  };
  byPayment?: { method: string; revenue: number; orders: number }[];
  bySource?: { source: string; revenue: number; orders: number }[];
  byCategory?: { id: string; name: string; quantity: number; revenue: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  abcProducts: {
    name: string;
    quantity: number;
    revenue: number;
    abcClass: "A" | "B" | "C";
    revenueShare: number;
    removeCandidate: boolean;
  }[];
  hourly: { hour: number; count: number; revenue: number }[];
  daily: { date: string; dateKey?: string; revenue: number; orders: number }[];
};

const SOURCE_LABELS: Record<string, string> = {
  QR_TABLE: "QR stol",
  ONLINE: "Online",
  WAITER: "Ofitsiant",
  CASHIER: "Kassir",
};

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgoYmd(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ReportsDashboard({ cafeId }: { cafeId: string }) {
  const [period, setPeriod] = useState<ReportPeriod>("day");
  const [from, setFrom] = useState(daysAgoYmd(6));
  const [to, setTo] = useState(todayYmd());
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ period });
    if (period === "custom") {
      params.set("from", from);
      params.set("to", to);
    }
    return params.toString();
  }, [period, from, to]);

  const load = useCallback(async () => {
    if (period === "custom" && (!from || !to)) {
      setError("Oraliq uchun sanalarni tanlang");
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cafes/${cafeId}/reports?${queryString}`);
      const json = await res.json();
      if (!res.ok || !json?.summary) {
        setData(null);
        setError(json?.error || "Hisobot yuklanmadi");
        return;
      }
      setData({
        ...json,
        hourly: json.hourly ?? [],
        daily: json.daily ?? [],
        topProducts: json.topProducts ?? [],
        abcProducts: json.abcProducts ?? [],
        byPayment: json.byPayment ?? [],
        bySource: json.bySource ?? [],
        byCategory: json.byCategory ?? [],
      });
    } catch {
      setData(null);
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }, [cafeId, period, from, to, queryString]);

  useEffect(() => {
    load();
  }, [load]);

  const maxHourly = Math.max(1, ...(data?.hourly?.map((h) => h.count) ?? [1]));
  const maxDaily = Math.max(1, ...(data?.daily?.map((d) => d.revenue) ?? [1]));

  function downloadCsv() {
    window.open(`/api/cafes/${cafeId}/reports/export?${queryString}`, "_blank");
  }

  return (
    <div className="reports-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--dp-text)]">Hisobotlar</h1>
          <p className="mt-1 text-[var(--dp-muted)]">Savdo va statistika</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadCsv}
            disabled={loading || !!error}
            className="reports-toolbar rounded-lg px-3 py-2 text-sm font-medium text-[var(--dp-text)] hover:bg-[var(--dp-nav-hover)] disabled:opacity-50"
          >
            CSV yuklab olish
          </button>
          <div className="reports-toolbar flex flex-wrap rounded-lg p-1">
            {(
              [
                ["day", "Bugun"],
                ["week", "7 kun"],
                ["month", "Oy"],
                ["custom", "Oraliq"],
              ] as const
            ).map(([p, label]) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  period === p
                    ? "bg-amber-600 text-white"
                    : "text-[var(--dp-subtle)] hover:bg-[var(--dp-nav-hover)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {period === "custom" && (
        <div className="reports-block mt-4 flex flex-wrap items-end gap-3 rounded-xl p-4">
          <label className="text-sm">
            <span className="mb-1 block text-[var(--dp-muted)]">Dan</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-[var(--dp-border)] bg-[var(--dp-bg)] px-3 py-2 text-[var(--dp-text)]"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[var(--dp-muted)]">Gacha</span>
            <input
              type="date"
              value={to}
              min={from}
              max={todayYmd()}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-[var(--dp-border)] bg-[var(--dp-bg)] px-3 py-2 text-[var(--dp-text)]"
            />
          </label>
          <p className="text-xs text-[var(--dp-muted)]">Maksimal 90 kun</p>
        </div>
      )}

      {loading ? (
        <p className="mt-12 text-center text-[var(--dp-muted)]">Yuklanmoqda...</p>
      ) : error || !data ? (
        <p className="mt-12 text-center text-red-500">{error || "Ma'lumot yo'q"}</p>
      ) : (
        <>
          {data.from && data.to && (
            <p className="mt-4 text-sm text-[var(--dp-muted)]">
              Davr: <strong>{data.from}</strong> — <strong>{data.to}</strong>
            </p>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Savdo" value={formatPrice(data.summary.totalRevenue)} />
            <Stat label="Buyurtmalar" value={String(data.summary.orderCount)} />
            <Stat label="O'rtacha chek" value={formatPrice(data.summary.avgCheck)} />
            <Stat
              label="Chegirmalar"
              value={formatPrice(data.summary.totalDiscount)}
            />
          </div>

          <div className="mt-6">
            <ShiftComparisonCard cafeId={cafeId} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="reports-block reports-block-soft rounded-xl p-5">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">Naqd</p>
              <p className="mt-1 text-xl font-bold text-emerald-800 dark:text-emerald-300">
                {formatPrice(data.summary.cashRevenue)}
              </p>
            </div>
            <div className="reports-block rounded-xl p-5">
              <p className="text-sm text-sky-700 dark:text-sky-400">Karta</p>
              <p className="mt-1 text-xl font-bold text-sky-900 dark:text-sky-300">
                {formatPrice(data.summary.cardRevenue)}
              </p>
            </div>
            <div className="reports-block rounded-xl p-5">
              <p className="text-sm text-violet-700 dark:text-violet-400">Payme</p>
              <p className="mt-1 text-xl font-bold text-violet-900 dark:text-violet-300">
                {formatPrice(data.summary.paymeRevenue ?? 0)}
              </p>
            </div>
            <div className="reports-block rounded-xl p-5">
              <p className="text-sm text-[var(--dp-muted)]">Boshqa</p>
              <p className="mt-1 text-xl font-bold text-[var(--dp-text)]">
                {formatPrice(data.summary.otherRevenue ?? 0)}
              </p>
            </div>
          </div>

          {data.summary.peakHour != null && (
            <p className="mt-4 text-sm text-[var(--dp-muted)]">
              Eng band soat:{" "}
              <strong>{String(data.summary.peakHour).padStart(2, "0")}:00</strong>
            </p>
          )}

          {(data.bySource?.length ?? 0) > 0 && (
            <section className="reports-block mt-8 rounded-xl p-6">
              <h2 className="font-semibold text-[var(--dp-text)]">Kanal bo&apos;yicha</h2>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--dp-muted)]">
                    <th className="pb-2">Kanal</th>
                    <th className="pb-2">Buyurtma</th>
                    <th className="pb-2">Savdo</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.bySource ?? [])
                    .filter((s) => s.orders > 0)
                    .map((s) => (
                      <tr key={s.source} className="border-t border-[var(--dp-border)]">
                        <td className="py-2 font-medium">
                          {SOURCE_LABELS[s.source] ?? s.source}
                        </td>
                        <td className="py-2">{s.orders}</td>
                        <td className="py-2">{formatPrice(s.revenue)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {(data.bySource ?? []).every((s) => s.orders === 0) && (
                <p className="mt-2 text-sm text-[var(--dp-muted)]">Ma&apos;lumot yo&apos;q</p>
              )}
            </section>
          )}

          {(data.byCategory?.length ?? 0) > 0 && (
            <section className="reports-block mt-8 rounded-xl p-6">
              <h2 className="font-semibold text-[var(--dp-text)]">
                Kategoriya bo&apos;yicha
              </h2>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--dp-muted)]">
                    <th className="pb-2">Kategoriya</th>
                    <th className="pb-2">Soni</th>
                    <th className="pb-2">Savdo</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.byCategory ?? []).map((c) => (
                    <tr key={c.id} className="border-t border-[var(--dp-border)]">
                      <td className="py-2 font-medium">{c.name}</td>
                      <td className="py-2">{c.quantity}</td>
                      <td className="py-2">{formatPrice(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {data.daily.length > 0 && (
            <section className="reports-block mt-8 rounded-xl p-6">
              <h2 className="font-semibold text-[var(--dp-text)]">Kunlik savdo</h2>
              <div className="mt-6 flex h-40 items-end gap-1 overflow-x-auto sm:gap-2">
                {data.daily.map((d) => (
                  <div
                    key={d.dateKey ?? d.date}
                    className="flex min-w-[28px] flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="min-h-[4px] w-full rounded-t bg-amber-500"
                      style={{
                        height: `${Math.max(8, (d.revenue / maxDaily) * 120)}px`,
                      }}
                      title={formatPrice(d.revenue)}
                    />
                    <span className="text-[10px] text-[var(--dp-muted)]">{d.date}</span>
                    <span className="text-xs font-medium">{d.orders}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.hourly.length > 0 && (
            <section className="reports-block mt-8 rounded-xl p-6">
              <h2 className="font-semibold text-[var(--dp-text)]">Soat bo&apos;yicha</h2>
              <div className="mt-6 flex h-32 items-end gap-1">
                {data.hourly.map((h) => (
                  <div
                    key={h.hour}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="min-h-[4px] w-full rounded-t bg-[var(--dp-accent)]"
                      style={{
                        height: `${Math.max(4, (h.count / maxHourly) * 100)}px`,
                      }}
                      title={`${h.count} buyurtma`}
                    />
                    <span className="text-[9px] text-[var(--dp-muted)]">{h.hour}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="reports-block mt-8 rounded-xl p-6">
            <h2 className="font-semibold text-[var(--dp-text)]">Eng ko&apos;p sotilgan</h2>
            {data.topProducts.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--dp-muted)]">Ma&apos;lumot yo&apos;q</p>
            ) : (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--dp-muted)]">
                    <th className="pb-2">Taom</th>
                    <th className="pb-2">Soni</th>
                    <th className="pb-2">Savdo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p, i) => (
                    <tr key={i} className="border-t border-[var(--dp-border)]">
                      <td className="py-2 font-medium">{p.name}</td>
                      <td className="py-2">{p.quantity}</td>
                      <td className="py-2">{formatPrice(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="reports-block mt-8 rounded-xl p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-[var(--dp-text)]">ABC analiz</h2>
              <p className="text-xs text-[var(--dp-muted)]">
                A: asosiy, B: o&apos;rta, C: past ulush
              </p>
            </div>
            {data.abcProducts?.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--dp-muted)]">Ma&apos;lumot yo&apos;q</p>
            ) : (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--dp-muted)]">
                    <th className="pb-2">Taom</th>
                    <th className="pb-2">Sinf</th>
                    <th className="pb-2">Ulush</th>
                    <th className="pb-2">Soni</th>
                    <th className="pb-2">Savdo</th>
                    <th className="pb-2">Tavsiya</th>
                  </tr>
                </thead>
                <tbody>
                  {data.abcProducts.slice(0, 15).map((p, i) => (
                    <tr key={`${p.name}-${i}`} className="border-t border-[var(--dp-border)]">
                      <td className="py-2 font-medium">{p.name}</td>
                      <td className="py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            p.abcClass === "A"
                              ? "bg-emerald-100 text-emerald-700"
                              : p.abcClass === "B"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-[var(--dp-card-header)] text-[var(--dp-text)]"
                          }`}
                        >
                          {p.abcClass}
                        </span>
                      </td>
                      <td className="py-2">{p.revenueShare.toFixed(1)}%</td>
                      <td className="py-2">{p.quantity}</td>
                      <td className="py-2">{formatPrice(p.revenue)}</td>
                      <td className="py-2 text-xs">
                        {p.removeCandidate ? (
                          <span className="font-semibold text-red-600">
                            Menyudan olib tashlashni ko&apos;rib chiqing
                          </span>
                        ) : (
                          <span className="text-[var(--dp-muted)]">Qoldirish</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="reports-block rounded-xl p-5">
      <p className="text-sm text-[var(--dp-muted)]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[var(--dp-text)]">{value}</p>
    </div>
  );
}

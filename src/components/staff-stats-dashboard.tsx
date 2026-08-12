"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { ShiftComparisonCard } from "@/components/shift-comparison-card";

type StaffRow = {
  userId: string;
  name: string;
  orderCount: number;
  tablesServed: number;
  avgOrderSom: number;
  revenueSom: number;
  serviceFeeSom: number;
  callsHandled: number;
  avgResponseSec: number | null;
  ratingAvg?: number;
  ratingCount?: number;
  periodRatingAvg?: number;
  periodRatingCount?: number;
};

export function StaffStatsDashboard({ cafeId }: { cafeId: string }) {
  const [period, setPeriod] = useState<"day" | "week">("week");
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [totals, setTotals] = useState({
    orders: 0,
    revenue: 0,
    serviceFee: 0,
    callsHandled: 0,
    pendingCalls: 0,
  });

  useEffect(() => {
    fetch(`/api/cafes/${cafeId}/staff-stats?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        setStaff(d.staff ?? []);
        setTotals(d.totals ?? { orders: 0, revenue: 0, serviceFee: 0, callsHandled: 0, pendingCalls: 0 });
      });
  }, [cafeId, period]);

  return (
    <div>
      <div className="mb-6 flex gap-2">
        {(["day", "week"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              period === p ? "bg-amber-600 text-white" : "bg-[var(--dp-card-header)] text-[var(--dp-text)]"
            }`}
          >
            {p === "day" ? "Bugun" : "7 kun"}
          </button>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Buyurtmalar" value={String(totals.orders)} />
        <StatCard label="Savdo" value={formatPrice(totals.revenue)} />
        <StatCard label="Xizmat foizi" value={formatPrice(totals.serviceFee ?? 0)} />
        <StatCard label="Chaqiruvlar" value={String(totals.callsHandled)} />
        <StatCard label="Kutilmoqda" value={String(totals.pendingCalls)} />
      </div>

      <div className="mb-6 overflow-x-auto rounded-xl border border-[var(--dp-border)] bg-[var(--dp-card)] shadow-sm">
        <table className="w-full text-sm text-[var(--dp-text)]">
          <thead>
            <tr className="border-b border-[var(--dp-border)] text-left text-[var(--dp-muted)]">
              <th className="p-3">Xodim</th>
              <th className="p-3">
                Reyting
                <span className="mt-0.5 block text-[10px] font-normal normal-case text-[var(--dp-muted)]">
                  {period === "day" ? "bugun" : "7 kun"} · umumiy
                </span>
              </th>
              <th className="p-3">Buyurtmalar</th>
              <th className="p-3">Stollar</th>
              <th className="p-3">O&apos;rt. chek</th>
              <th className="p-3">Savdo</th>
              <th className="p-3">Xizmat foizi</th>
              <th className="p-3">Chaqiruvlar</th>
              <th className="p-3">O&apos;rt. javob</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const periodCount = s.periodRatingCount ?? 0;
              const allCount = s.ratingCount ?? 0;
              const showPeriod = periodCount > 0;
              const showAll = allCount > 0;
              return (
              <tr key={s.userId} className="border-b">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">
                  {showPeriod || showAll ? (
                    <div className="space-y-0.5">
                      {showPeriod ? (
                        <span className="inline-flex items-center gap-1 text-[var(--dp-accent)]">
                          <span aria-hidden>★</span>
                          {Number(s.periodRatingAvg ?? 0).toFixed(1)}
                          <span className="text-[var(--dp-muted)]">({periodCount})</span>
                        </span>
                      ) : (
                        <span className="text-[var(--dp-muted)]">—</span>
                      )}
                      {showAll && allCount !== periodCount ? (
                        <p className="text-[10px] text-[var(--dp-muted)]">
                          Umumiy: {Number(s.ratingAvg ?? 0).toFixed(1)} ({allCount})
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-[var(--dp-muted)]">—</span>
                  )}
                </td>
                <td className="p-3">{s.orderCount}</td>
                <td className="p-3">{s.tablesServed ?? 0}</td>
                <td className="p-3">{(s.avgOrderSom ?? 0).toLocaleString("uz-UZ")} so&apos;m</td>
                <td className="p-3">{s.revenueSom.toLocaleString("uz-UZ")} so&apos;m</td>
                <td className="p-3">{s.serviceFeeSom.toLocaleString("uz-UZ")} so&apos;m</td>
                <td className="p-3">{s.callsHandled}</td>
                <td className="p-3">
                  {s.avgResponseSec != null ? `${s.avgResponseSec}s` : "—"}
                </td>
              </tr>
              );
            })}
            {staff.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-[var(--dp-muted)]">
                  Ma&apos;lumot yo&apos;q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--dp-card)] p-4 shadow-sm">
      <p className="text-xs text-[var(--dp-muted)]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[var(--dp-text)]">{value}</p>
    </div>
  );
}

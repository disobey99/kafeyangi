"use client";

import { useMemo, useState } from "react";
import { maskPlatformMoney } from "@/lib/platform-permissions";
import { formatPlanCents, planLabel, type PlanCurrency, type PlanId } from "@/lib/plans";

type Tx = {
  id: string;
  cafeName: string;
  plan: string;
  amount: number;
  status: string;
  method: string;
  paidAt: string | null;
  createdAt: string;
};

const FILTERS = [
  { id: "ALL", label: "Hammasi" },
  { id: "PAID", label: "To'landi" },
  { id: "PENDING", label: "Kutilmoqda" },
  { id: "FAILED", label: "Muvaffaqiyatsiz" },
] as const;

export function PlatformPaymentsClient({
  transactions,
  currency = "USD",
  hideMoney = false,
}: {
  transactions: Tx[];
  currency?: PlanCurrency;
  hideMoney?: boolean;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("ALL");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    return transactions.filter((t) => {
      if (filter === "PENDING" && t.status !== "PENDING" && t.status !== "OVERDUE") {
        return false;
      }
      if (filter !== "ALL" && filter !== "PENDING" && t.status !== filter) return false;
      if (q.trim()) {
        const s = q.trim().toLowerCase();
        return (
          t.cafeName.toLowerCase().includes(s) ||
          t.id.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [transactions, filter, q]);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-stone-900">Tranzaksiyalar</h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Mijoz yoki ID"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              filter === f.id
                ? "bg-violet-600 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-stone-400">
          Hali obuna to&apos;lovlari yo&apos;q. Tarif uzaytirilganda yoki hisob-faktura
          yaratilganda shu yerda ko&apos;rinadi.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-stone-500">
                <th className="pb-2 font-medium">Mijoz</th>
                <th className="pb-2 font-medium">Summa</th>
                <th className="pb-2 font-medium">Usul</th>
                <th className="pb-2 font-medium">Holati</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-t border-stone-100">
                  <td className="py-3">
                    <p className="font-semibold text-stone-900">{t.cafeName}</p>
                    <p className="text-xs text-stone-400">
                      {planLabel(t.plan as PlanId)} ·{" "}
                      {new Date(t.createdAt).toLocaleDateString("uz-UZ")}
                    </p>
                  </td>
                  <td className="py-3 font-bold">
                    {maskPlatformMoney(formatPlanCents(t.amount, currency), hideMoney)}
                  </td>
                  <td className="py-3 text-stone-600">{t.method}</td>
                  <td className="py-3">
                    <TxStatus status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TxStatus({ status }: { status: string }) {
  if (status === "PAID") {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
        To&apos;landi
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
        Muvaffaqiyatsiz
      </span>
    );
  }
  if (status === "OVERDUE") {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
        Muddati o&apos;tgan
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
      Kutilmoqda
    </span>
  );
}

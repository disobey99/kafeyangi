"use client";

import { useCallback, useEffect, useState } from "react";
import { printZReportReceipt } from "@/lib/receipt-print";
import { formatPrice } from "@/lib/utils";

type ZData = {
  cafeName: string;
  date: string;
  summary: {
    totalRevenue: number;
    totalDiscount: number;
    cashRevenue: number;
    cardRevenue: number;
    paymeRevenue?: number;
    otherRevenue?: number;
    orderCount: number;
    avgCheck: number;
  };
  byPayment: { method: string; revenue: number; orders: number }[];
  bySource: { source: string; revenue: number; orders: number }[];
  expectedCash: number;
  lastVariance: {
    id: string;
    expectedCash: number;
    actualCash: number;
    variance: number;
    note: string | null;
    shiftLabel: string | null;
    cashierName: string;
    createdAt: string;
  } | null;
};

const PAY_LABELS: Record<string, string> = {
  CASH: "Naqd",
  CARD: "Karta",
  PAYME: "Payme",
  OTHER: "Boshqa",
};

const SOURCE_LABELS: Record<string, string> = {
  QR_TABLE: "QR stol",
  ONLINE: "Online",
  WAITER: "Ofitsiant",
  CASHIER: "Kassir",
};

function somToTiyinInput(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const som = Number(cleaned);
  if (!Number.isFinite(som) || som < 0) return null;
  return Math.round(som * 100);
}

export function CashierZClose({
  cafeId,
  cafeName,
}: {
  cafeId: string;
  cafeName: string;
}) {
  const [data, setData] = useState<ZData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actualSom, setActualSom] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cafes/${cafeId}/z-report`);
      const json = await res.json();
      if (!res.ok) {
        setData(null);
        setError(json?.error || "Z-hisobot yuklanmadi");
        return;
      }
      setData(json);
      if (json.lastVariance) {
        setActualSom(String(Math.floor(json.lastVariance.actualCash / 100)));
        setNote(json.lastVariance.note || "");
      }
    } catch {
      setData(null);
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => {
    load();
  }, [load]);

  const expectedCash = data?.expectedCash ?? 0;
  const actualTiyin = somToTiyinInput(actualSom);
  const variance =
    actualTiyin != null ? actualTiyin - expectedCash : null;

  async function saveVariance() {
    if (actualTiyin == null) {
      setMessage("Haqiqiy naqd summasini kiriting");
      return;
    }
    if (variance !== 0 && !note.trim()) {
      setMessage("Farq bor — izoh majburiy");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/cafes/${cafeId}/cash-variance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualCash: actualTiyin,
          note: note.trim() || undefined,
          shiftLabel: `Z ${data?.date ?? ""}`,
          date: data?.date,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json?.error || "Saqlanmadi");
        return;
      }
      setMessage("Kun yopish saqlandi");
      await load();
    } catch {
      setMessage("Ulanish xatosi");
    } finally {
      setSaving(false);
    }
  }

  function printZ() {
    if (!data) return;
    printZReportReceipt({
      cafeName: data.cafeName || cafeName,
      date: data.date,
      orderCount: data.summary.orderCount,
      totalRevenue: data.summary.totalRevenue,
      totalDiscount: data.summary.totalDiscount,
      avgCheck: data.summary.avgCheck,
      byPayment: data.byPayment,
      bySource: data.bySource,
      expectedCash: data.expectedCash,
      actualCash: data.lastVariance?.actualCash ?? actualTiyin,
      variance: data.lastVariance?.variance ?? variance,
      cashierName: data.lastVariance?.cashierName,
      note: data.lastVariance?.note ?? (note.trim() || null),
    });
  }

  if (loading) {
    return <p className="py-8 text-center text-[var(--dp-muted)]">Yuklanmoqda...</p>;
  }

  if (error || !data) {
    return <p className="py-8 text-center text-red-500">{error || "Ma'lumot yo'q"}</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="rounded-2xl bg-[var(--dp-card)] p-5 shadow-sm ring-1 ring-[var(--dp-border)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--dp-text)]">Kun yopish (Z)</h2>
            <p className="text-sm text-[var(--dp-muted)]">{data.date}</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-[var(--dp-border)] px-3 py-1.5 text-sm"
          >
            Yangilash
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniStat label="Savdo" value={formatPrice(data.summary.totalRevenue)} />
          <MiniStat label="Buyurtmalar" value={String(data.summary.orderCount)} />
          <MiniStat label="Chegirma" value={formatPrice(data.summary.totalDiscount)} />
          <MiniStat label="O'rtacha chek" value={formatPrice(data.summary.avgCheck)} />
        </div>

        <h3 className="mt-5 text-sm font-semibold text-[var(--dp-text)]">To&apos;lov</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {data.byPayment
            .filter((p) => p.orders > 0 || p.revenue > 0)
            .map((p) => (
              <li key={p.method} className="flex justify-between gap-2">
                <span>
                  {PAY_LABELS[p.method] ?? p.method}{" "}
                  <span className="text-[var(--dp-muted)]">({p.orders})</span>
                </span>
                <span className="font-medium">{formatPrice(p.revenue)}</span>
              </li>
            ))}
          {data.byPayment.every((p) => p.orders === 0) && (
            <li className="text-[var(--dp-muted)]">Bugun to&apos;lov yo&apos;q</li>
          )}
        </ul>

        <h3 className="mt-5 text-sm font-semibold text-[var(--dp-text)]">Kanal</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {data.bySource
            .filter((s) => s.orders > 0)
            .map((s) => (
              <li key={s.source} className="flex justify-between gap-2">
                <span>{SOURCE_LABELS[s.source] ?? s.source}</span>
                <span className="font-medium">{formatPrice(s.revenue)}</span>
              </li>
            ))}
        </ul>
      </div>

      <div className="rounded-2xl bg-[var(--dp-card)] p-5 shadow-sm ring-1 ring-[var(--dp-border)]">
        <h3 className="font-semibold text-[var(--dp-text)]">Naqd kassa</h3>
        <p className="mt-1 text-sm text-[var(--dp-muted)]">
          Kutilgan naqd (tizim):{" "}
          <strong className="text-[var(--dp-text)]">
            {formatPrice(expectedCash)}
          </strong>
        </p>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-[var(--dp-muted)]">
            Haqiqiy naqd (so&apos;m)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={actualSom}
            onChange={(e) => setActualSom(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-[var(--dp-border)] bg-[var(--dp-bg)] px-3 py-2.5 text-lg font-semibold text-[var(--dp-text)]"
          />
        </label>

        {variance != null && (
          <p
            className={`mt-2 text-sm font-semibold ${
              variance === 0
                ? "text-emerald-600"
                : variance < 0
                  ? "text-red-600"
                  : "text-amber-600"
            }`}
          >
            Farq: {formatPrice(variance)}
          </p>
        )}

        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-[var(--dp-muted)]">
            Izoh {variance != null && variance !== 0 ? "(majburiy)" : "(ixtiyoriy)"}
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-[var(--dp-border)] bg-[var(--dp-bg)] px-3 py-2 text-[var(--dp-text)]"
            placeholder="Masalan: qaytim xatosi"
          />
        </label>

        {data.lastVariance && (
          <p className="mt-3 rounded-lg bg-[var(--dp-accent-soft)] px-3 py-2 text-xs text-[var(--dp-text)]">
            Oxirgi yozuv: {data.lastVariance.cashierName} — farq{" "}
            {formatPrice(data.lastVariance.variance)} (
            {new Date(data.lastVariance.createdAt).toLocaleTimeString("uz-UZ", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            )
          </p>
        )}

        {message && (
          <p className="mt-3 text-sm text-[var(--dp-muted)]">{message}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveVariance()}
            className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saqlanmoqda..." : "Kun yopishni saqlash"}
          </button>
          <button
            type="button"
            onClick={printZ}
            className="rounded-xl border border-[var(--dp-border)] px-4 py-2.5 text-sm font-semibold text-[var(--dp-text)]"
          >
            Z chop etish
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--dp-bg)] px-3 py-2">
      <p className="text-xs text-[var(--dp-muted)]">{label}</p>
      <p className="text-sm font-bold text-[var(--dp-text)]">{value}</p>
    </div>
  );
}

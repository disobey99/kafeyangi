"use client";

import { useMemo, useState } from "react";
import { calcDiscountedPrice } from "@/lib/plan-math";
import { formatSom, getPlanConfig, planLabel, type PlanCurrency, type PlanId } from "@/lib/plans";
import type { PlanDiscountConfig } from "@/lib/platform-settings-types";

const PLAN_IDS: PlanId[] = ["STARTER", "STANDARD", "PRO"];

type TariffState = {
  planCurrency: PlanCurrency;
  planPrices: Record<PlanId, number>;
  planDiscounts: Record<PlanId, PlanDiscountConfig>;
};

export function PlatformTariffSettings({
  initial,
  onSave,
}: {
  initial: TariffState;
  onSave: (patch: TariffState) => Promise<void>;
}) {
  const [state, setState] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = state.planCurrency;
  const currencyLabel = currency === "USD" ? "$" : "so'm";

  const previews = useMemo(
    () =>
      PLAN_IDS.map((id) => {
        const base = state.planPrices[id];
        const d = state.planDiscounts[id];
        const discounted =
          d.enabled && d.percent > 0 ? calcDiscountedPrice(base, d.percent) : base;
        return { id, base, discounted, d };
      }),
    [state],
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await onSave(state);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void save(e)}
      className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100"
    >
      <div>
        <h2 className="font-bold text-stone-900">Tarif narxlari va aksiyalar</h2>
        <p className="mt-1 text-sm text-stone-500">
          Narx o&apos;zgarsa landing, obuna va hisob-fakturalarda ham yangilanadi
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-sm font-medium text-stone-700">Obuna valyutasi</p>
        <p className="mt-1 text-xs text-stone-500">
          Narxlarni shu valyutada yozasiz — sayt va panelda shunday ko&apos;rinadi
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              { id: "USD" as const, label: "Dollar ($)" },
              { id: "UZS" as const, label: "So'm" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setState({ ...state, planCurrency: opt.id })}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                currency === opt.id
                  ? "bg-violet-600 text-white"
                  : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {previews.map(({ id, base, discounted, d }) => (
          <div
            key={id}
            className="rounded-xl border border-stone-200 bg-stone-50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-stone-900">{planLabel(id)}</p>
                <p className="text-xs text-stone-500">{getPlanConfig(id).description}</p>
              </div>
              <div className="text-right">
                {d.enabled && d.percent > 0 ? (
                  <>
                    <p className="text-xs text-stone-400 line-through">
                      {formatSom(base, currency)}/oy
                    </p>
                    <p className="font-bold text-emerald-700">
                      {formatSom(discounted, currency)}
                      <span className="text-xs font-medium text-stone-400">/oy</span>
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                        -{d.percent}%
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="font-bold text-violet-700">
                    {formatSom(base, currency)}
                    <span className="text-xs font-medium text-stone-400">/oy</span>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-stone-600">
                  Oylik narx ({currencyLabel})
                </span>
                <input
                  type="number"
                  min={currency === "USD" ? 1 : 1000}
                  step={currency === "USD" ? 1 : 1000}
                  required
                  value={state.planPrices[id]}
                  onChange={(e) =>
                    setState({
                      ...state,
                      planPrices: {
                        ...state.planPrices,
                        [id]: Number(e.target.value) || 0,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                />
              </label>

              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={d.enabled}
                  onChange={(e) =>
                    setState({
                      ...state,
                      planDiscounts: {
                        ...state.planDiscounts,
                        [id]: { ...d, enabled: e.target.checked },
                      },
                    })
                  }
                  className="h-4 w-4 rounded"
                />
                <span className="font-medium text-stone-700">Chegirma aksiyasi</span>
              </label>

              {d.enabled && (
                <>
                  <label className="block text-sm">
                    <span className="font-medium text-stone-600">Chegirma (%)</span>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={d.percent || ""}
                      onChange={(e) =>
                        setState({
                          ...state,
                          planDiscounts: {
                            ...state.planDiscounts,
                            [id]: {
                              ...d,
                              percent: Math.min(90, Math.max(0, Number(e.target.value) || 0)),
                            },
                          },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-stone-600">Chegirmali narx</span>
                    <input
                      readOnly
                      value={`${formatSom(discounted, currency)}/oy`}
                      className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-emerald-700"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-stone-600">Boshlanish</span>
                    <input
                      type="date"
                      value={d.validFrom}
                      onChange={(e) =>
                        setState({
                          ...state,
                          planDiscounts: {
                            ...state.planDiscounts,
                            [id]: { ...d, validFrom: e.target.value },
                          },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-stone-600">Tugash</span>
                    <input
                      type="date"
                      value={d.validTo}
                      onChange={(e) =>
                        setState({
                          ...state,
                          planDiscounts: {
                            ...state.planDiscounts,
                            [id]: { ...d, validTo: e.target.value },
                          },
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? "Saqlanmoqda…" : "Tariflarni saqlash"}
        </button>
        {saved && <p className="text-sm font-medium text-emerald-600">Saqlandi</p>}
      </div>
    </form>
  );
}

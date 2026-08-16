"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { fromQtyBase, toQtyBase } from "@/lib/warehouse-units";

type Material = { id: string; name: string; baseUnit: string };

type Line = {
  rawMaterialId: string;
  unit: string;
  qty: string;
};

export function ProductRecipeEditor({
  cafeId,
  productId,
}: {
  cafeId: string;
  productId: string;
}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [planLocked, setPlanLocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const [mRes, rRes] = await Promise.all([
          fetch(`/api/cafes/${cafeId}/warehouse/materials`),
          fetch(`/api/products/${productId}/recipe`),
        ]);
        if (mRes.status === 403 || rRes.status === 403) {
          if (!cancelled) setPlanLocked(true);
          return;
        }
        const mData = (await mRes.json()) as { materials?: Material[] };
        const rData = (await rRes.json()) as {
          recipe?: {
            items: Array<{
              rawMaterialId: string;
              unit: string;
              qty: number;
              qtyBase: number;
            }>;
          } | null;
        };
        if (cancelled) return;
        setMaterials(mData.materials ?? []);
        const mats = mData.materials ?? [];
        if (rData.recipe?.items?.length) {
          setLines(
            rData.recipe.items.map((i) => {
              const m = mats.find((x) => x.id === i.rawMaterialId);
              const unit = m?.baseUnit ?? i.unit;
              const display = fromQtyBase(unit, i.qtyBase ?? i.qty);
              return {
                rawMaterialId: i.rawMaterialId,
                unit,
                qty: String(display),
              };
            }),
          );
        } else {
          setLines([]);
        }
      } catch {
        if (!cancelled) setError("Retsept yuklanmadi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cafeId, productId]);

  async function save() {
    setBusy(true);
    setError("");
    setOk("");
    try {
      if (lines.length === 0) {
        setError("Kamida 1 ta xomashyo qo‘shing");
        return;
      }
      const items = lines.map((l) => {
        const qty = Number(l.qty);
        if (!l.rawMaterialId || !Number.isFinite(qty) || qty <= 0) {
          throw new Error("Miqdor noto‘g‘ri");
        }
        const qtyBase = toQtyBase(l.unit, qty);
        if (qtyBase < 1) throw new Error("Miqdor juda kichik");
        // API qty int — KG/L uchun bazaga (g/ml) yozamiz
        const unit =
          l.unit === "KG" ? "G" : l.unit === "L" ? "ML" : l.unit;
        return {
          rawMaterialId: l.rawMaterialId,
          unit,
          qty: qtyBase,
          qtyBase,
        };
      });
      const res = await fetch(`/api/products/${productId}/recipe`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, isActive: true }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Saqlanmadi");
        return;
      }
      setOk("Retsept saqlandi — sotuvda ombor avtomatik kamayadi");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  }

  if (planLocked) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Retsept / ombor ratsiyasi Pro tarifda ochiladi.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs text-[var(--dp-muted)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Retsept…
      </p>
    );
  }

  return (
    <div className="sm:col-span-2 space-y-2 rounded-xl border border-[var(--dp-border)] bg-[var(--dp-card-header)]/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--dp-text)]">
          Ombor retsepti (1 porsiya)
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--dp-border)] bg-white px-2 py-1 text-xs font-medium"
          onClick={() =>
            setLines((prev) => [
              ...prev,
              {
                rawMaterialId: materials[0]?.id ?? "",
                unit: materials[0]?.baseUnit ?? "G",
                qty: "1",
              },
            ])
          }
          disabled={materials.length === 0}
        >
          <Plus className="h-3.5 w-3.5" /> Qo‘shish
        </button>
      </div>
      {materials.length === 0 ? (
        <p className="text-xs text-[var(--dp-muted)]">
          Avval Ombor → xomashyo qo‘shing.
        </p>
      ) : (
        <ul className="space-y-2">
          {lines.map((line, idx) => (
            <li key={idx} className="flex flex-wrap items-center gap-2">
              <select
                className="input flex-1 min-w-[8rem] py-1.5 text-xs"
                value={line.rawMaterialId}
                onChange={(e) => {
                  const id = e.target.value;
                  const m = materials.find((x) => x.id === id);
                  setLines((prev) =>
                    prev.map((row, i) =>
                      i === idx
                        ? {
                            ...row,
                            rawMaterialId: id,
                            unit: m?.baseUnit ?? row.unit,
                          }
                        : row,
                    ),
                  );
                }}
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.baseUnit})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={line.unit === "KG" || line.unit === "L" ? 0.001 : 1}
                step={line.unit === "KG" || line.unit === "L" ? 0.001 : 1}
                className="input w-24 py-1.5 text-xs"
                value={line.qty}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((row, i) =>
                      i === idx ? { ...row, qty: e.target.value } : row,
                    ),
                  )
                }
              />
              <span className="text-xs text-[var(--dp-muted)]">{line.unit}</span>
              <button
                type="button"
                className="rounded-lg p-1.5 text-[var(--dp-muted)] hover:text-red-600"
                onClick={() =>
                  setLines((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {ok && <p className="text-xs text-emerald-700">{ok}</p>}
      <button
        type="button"
        disabled={busy || materials.length === 0}
        onClick={() => void save()}
        className="btn btn-secondary w-full py-2 text-xs disabled:opacity-50"
      >
        {busy ? "Saqlanmoqda…" : "Retseptni saqlash"}
      </button>
    </div>
  );
}

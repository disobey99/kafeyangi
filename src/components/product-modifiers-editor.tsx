"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { ModifierHelpBanner, ModifierHelpHint } from "@/components/modifier-help-hint";

type GroupDraft = {
  name: string;
  nameRu: string;
  nameEn: string;
  required: boolean;
  maxSelect: number;
  options: { name: string; nameRu: string; nameEn: string; priceDeltaSom: string }[];
};

type ApiOption = {
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  priceDelta: number;
};

type ApiGroup = {
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  required: boolean;
  maxSelect: number;
  options?: ApiOption[];
};

function mapGroups(raw: ApiGroup[]): GroupDraft[] {
  return raw.map((g) => ({
    name: g.name,
    nameRu: g.nameRu ?? "",
    nameEn: g.nameEn ?? "",
    required: g.required,
    maxSelect: g.maxSelect ?? 1,
    options: (g.options ?? []).map((o) => ({
      name: o.name,
      nameRu: o.nameRu ?? "",
      nameEn: o.nameEn ?? "",
      priceDeltaSom: String((o.priceDelta ?? 0) / 100),
    })),
  }));
}

export function ProductModifiersEditor({
  productId,
  productName,
  onClose,
}: {
  productId: string;
  productName: string;
  onClose: () => void;
}) {
  const [groups, setGroups] = useState<GroupDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/products/${productId}/modifiers`);
        const data = (await res.json()) as { groups?: ApiGroup[]; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Yuklab bo'lmadi");
          setGroups([]);
          return;
        }
        setGroups(mapGroups(data.groups ?? []));
      } catch {
        if (!cancelled) {
          setError("Ulanish xatosi — sahifani yangilang");
          setGroups([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  function addGroup() {
    setGroups([
      ...groups,
      {
        name: "Hajm",
        nameRu: "Размер",
        nameEn: "Size",
        required: false,
        maxSelect: 1,
        options: [
          { name: "Kichik", nameRu: "Маленький", nameEn: "Small", priceDeltaSom: "0" },
          { name: "Katta", nameRu: "Большой", nameEn: "Large", priceDeltaSom: "5" },
        ],
      },
    ]);
  }

  async function save() {
    setSaving(true);
    setError("");

    const payload = groups
      .map((g) => ({
        name: g.name.trim(),
        nameRu: g.nameRu.trim() || null,
        nameEn: g.nameEn.trim() || null,
        required: g.required,
        minSelect: g.required ? 1 : 0,
        maxSelect: g.maxSelect,
        options: g.options
          .map((o) => ({
            name: o.name.trim(),
            nameRu: o.nameRu.trim() || null,
            nameEn: o.nameEn.trim() || null,
            priceDeltaSom: parseInt(String(o.priceDeltaSom).replace(/\s/g, ""), 10) || 0,
          }))
          .filter((o) => o.name.length > 0),
      }))
      .filter((g) => g.name.length > 0 && g.options.length > 0);

    if (payload.length === 0) {
      setError("Guruh nomi va kamida bitta variant kiriting");
      setSaving(false);
      return;
    }

    for (const g of payload) {
      if (!g.name) {
        setError("Guruh nomini kiriting (masalan: Hajm, Qo'shimcha)");
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/products/${productId}/modifiers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Saqlab bo'lmadi");
        return;
      }
      onClose();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--dp-card)] p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--dp-text)]">Variantlar</h2>
            <p className="text-sm text-[var(--dp-muted)]">{productName}</p>
          </div>
          <div className="flex items-center gap-1">
            <ModifierHelpHint />
            <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-black/5">
            <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {!loading && <ModifierHelpBanner />}

        {loading ? (
          <p className="text-sm text-[var(--dp-muted)]">Yuklanmoqda...</p>
        ) : (
          <div className="space-y-4">
            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            {groups.length === 0 && !error && (
              <p className="text-sm text-[var(--dp-muted)]">
                Hali variant yo&apos;q — «Guruh qo&apos;shish» bosing (masalan: Kichik / Katta hajm).
              </p>
            )}
            {groups.map((g, gi) => (
              <div key={gi} className="rounded-xl border border-[var(--dp-border)] p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <input
                    className="input flex-1 text-sm"
                    value={g.name}
                    onChange={(e) => {
                      const next = [...groups];
                      next[gi].name = e.target.value;
                      setGroups(next);
                    }}
                    placeholder="Guruh nomi (masalan: Hajm)"
                  />
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={g.required}
                      onChange={(e) => {
                        const next = [...groups];
                        next[gi].required = e.target.checked;
                        setGroups(next);
                      }}
                    />
                    Majburiy
                  </label>
                  <button
                    type="button"
                    onClick={() => setGroups(groups.filter((_, i) => i !== gi))}
                    className="text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {g.options.map((o, oi) => (
                  <div key={oi} className="mt-2 flex flex-wrap gap-2">
                    <input
                      className="input min-w-[100px] flex-1 text-sm"
                      value={o.name}
                      onChange={(e) => {
                        const next = [...groups];
                        next[gi].options[oi].name = e.target.value;
                        setGroups(next);
                      }}
                      placeholder="Variant (Kichik, Katta...)"
                    />
                    <input
                      className="input w-28 text-sm"
                      type="number"
                      min={0}
                      value={o.priceDeltaSom}
                      onChange={(e) => {
                        const next = [...groups];
                        next[gi].options[oi].priceDeltaSom = e.target.value;
                        setGroups(next);
                      }}
                      placeholder="+ so'm"
                    />
                    {g.options.length > 1 && (
                      <button
                        type="button"
                        className="text-red-400"
                        onClick={() => {
                          const next = [...groups];
                          next[gi].options = next[gi].options.filter((_, i) => i !== oi);
                          setGroups(next);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="mt-2 text-xs text-[var(--dp-accent)]"
                  onClick={() => {
                    const next = [...groups];
                    next[gi].options.push({
                      name: "",
                      nameRu: "",
                      nameEn: "",
                      priceDeltaSom: "0",
                    });
                    setGroups(next);
                  }}
                >
                  + Variant
                </button>
              </div>
            ))}
            <button type="button" onClick={addGroup} className="btn btn-secondary gap-1 text-sm">
              <Plus className="h-4 w-4" /> Guruh qo&apos;shish
            </button>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Bekor
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="btn btn-primary flex-1"
          >
            {saving ? "..." : "Saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
}

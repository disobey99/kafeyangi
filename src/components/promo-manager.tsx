"use client";

import { useCallback, useEffect, useState } from "react";
import { NumberInput } from "@/components/ui/number-input";

type Promo = {
  id: string;
  name: string;
  type: "PERCENT" | "FIXED";
  value: number;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
  label: string;
  activeNow: boolean;
};

export function PromoManager({ cafeId }: { cafeId: string }) {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "PERCENT" as "PERCENT" | "FIXED",
    value: "" as number | "",
    startTime: "",
    endTime: "",
  });

  const load = useCallback(async () => {
    const res = await fetch(`/api/cafes/${cafeId}/promotions?channel=DISCOUNT`);
    const data = await res.json();
    setPromos(data.promotions ?? []);
  }, [cafeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.value === "" || form.value < 1) {
      setError("Foiz yoki summani kiriting");
      return;
    }
    setLoading(true);

    const res = await fetch(`/api/cafes/${cafeId}/promotions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        type: form.type,
        value: form.value,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        channel: "DISCOUNT",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Xatolik");
      setLoading(false);
      return;
    }

    setForm({ name: "", type: "PERCENT", value: "", startTime: "", endTime: "" });
    setOpen(false);
    setLoading(false);
    load();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/promotions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("O'chirish?")) return;
    await fetch(`/api/promotions/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--dp-text)]">Chegirmalar</h1>
          <p className="mt-1 text-[var(--dp-muted)]">
            Happy hour va narx chegirmasi (ilova bannerlaridan alohida)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="btn btn-primary shrink-0"
        >
          {open ? "Yopish" : "+ Aksiya qo'shish"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={handleAdd}
          className="dp-card mt-6 rounded-xl border border-[var(--dp-border)] p-6 shadow-[var(--dp-shadow)]"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-[var(--dp-text)]">Nomi</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Happy hour"
                className="input mt-1 w-full"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[var(--dp-text)]">Turi</span>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value as "PERCENT" | "FIXED",
                  })
                }
                className="input mt-1 w-full"
              >
                <option value="PERCENT">Foiz (%)</option>
                <option value="FIXED">Qat&apos;iy summa (so&apos;m)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[var(--dp-text)]">
                {form.type === "PERCENT" ? "Foiz" : "Summa (so'm)"}
              </span>
              <NumberInput
                required
                min={1}
                max={form.type === "PERCENT" ? 100 : undefined}
                value={form.value}
                onValueChange={(v) => setForm({ ...form, value: v })}
                placeholder={form.type === "PERCENT" ? "Masalan: 15" : "Masalan: 5000"}
                className="input mt-1 w-full"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[var(--dp-text)]">Boshlanish (ixtiyoriy)</span>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) =>
                  setForm({ ...form, startTime: e.target.value })
                }
                className="input mt-1 w-full"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-[var(--dp-text)]">Tugash (ixtiyoriy)</span>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="input mt-1 w-full"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-[var(--dp-muted)]">
            Vaqt kiritmasangiz — kun bo&apos;yi amal qiladi
          </p>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary mt-4 disabled:opacity-50"
          >
            Saqlash
          </button>
        </form>
      )}

      <div className="mt-8 space-y-3">
        {promos.length === 0 ? (
          <p className="text-sm text-[var(--dp-muted)]">Aksiyalar yo&apos;q</p>
        ) : (
          promos.map((p) => (
            <div
              key={p.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
                p.activeNow
                  ? "border-[var(--dp-accent)] bg-[var(--dp-accent-soft)]"
                  : "border-[var(--dp-border)] bg-[var(--dp-card)]"
              }`}
            >
              <div>
                <p className="font-semibold text-[var(--dp-text)]">{p.name}</p>
                <p className="text-sm text-[var(--dp-subtle)]">{p.label}</p>
                {p.startTime && p.endTime && (
                  <p className="text-xs text-[var(--dp-muted)]">
                    {p.startTime} — {p.endTime}
                  </p>
                )}
                {p.activeNow && (
                  <span className="mt-1 inline-block rounded-full bg-[var(--dp-accent)]/15 px-2 py-0.5 text-xs font-medium text-[var(--dp-accent)]">
                    Hozir faol
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleActive(p.id, p.isActive)}
                  className="rounded-lg border border-[var(--dp-border)] bg-[var(--dp-card-header)] px-3 py-1.5 text-xs font-medium text-[var(--dp-text)] transition hover:opacity-90"
                >
                  {p.isActive ? "To'xtatish" : "Yoqish"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500/10"
                >
                  O&apos;chirish
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Check, Loader2, X } from "lucide-react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";

export type ShiftSwapItem = {
  id: string;
  requesterId: string;
  requesterName: string;
  fromDate: string;
  toDate: string;
  note: string | null;
  status: "OPEN" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  acceptedBy: string | null;
  acceptedByName: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<ShiftSwapItem["status"], string> = {
  OPEN: "Ochiq",
  ACCEPTED: "Qabul qilindi",
  DECLINED: "Rad etildi",
  CANCELLED: "Bekor qilindi",
};

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRange(from: string, to: string) {
  const a = new Date(from);
  const b = new Date(to);
  const opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${a.toLocaleString("uz-UZ", opts)} → ${b.toLocaleString("uz-UZ", opts)}`;
}

function defaultFrom() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toLocalInputValue(d);
}

function defaultTo() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 9);
  return toLocalInputValue(d);
}

export function ShiftSwapPanel({
  cafeId,
  userId,
  compact = false,
  className = "",
}: {
  cafeId: string;
  userId?: string;
  compact?: boolean;
  className?: string;
}) {
  const [swaps, setSwaps] = useState<ShiftSwapItem[]>([]);
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<"open" | "mine" | "all">("open");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafeId}/shift-swaps`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Yuklanmadi");
        return;
      }
      setSwaps((data.swaps ?? []) as ShiftSwapItem[]);
      setError("");
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useCafeRealtime(cafeId, (event) => {
    if (event.type === "ops.shift_swap.updated") void load();
  });

  const visible = useMemo(() => {
    if (filter === "all") return swaps;
    if (filter === "mine" && userId) {
      return swaps.filter(
        (s) => s.requesterId === userId || s.acceptedBy === userId,
      );
    }
    return swaps.filter((s) => s.status === "OPEN");
  }, [swaps, filter, userId]);

  async function createSwap(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      setError("Sanalarni to'g'ri kiriting");
      return;
    }
    if (to <= from) {
      setError("Tugash sanasi boshlanishdan keyin bo'lishi kerak");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/shift-swaps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate: from.toISOString(),
          toDate: to.toISOString(),
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Yuborilmadi");
        return;
      }
      setMsg("So'rov ochildi — boshqa xodimlar qabul qilishi mumkin");
      setNote("");
      setFromDate(defaultFrom());
      setToDate(defaultTo());
      await load();
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setSubmitting(false);
    }
  }

  async function patchStatus(
    id: string,
    status: "ACCEPTED" | "DECLINED" | "CANCELLED",
  ) {
    setBusyId(id);
    setError("");
    setMsg("");
    try {
      const res = await fetch(`/api/cafes/${cafeId}/shift-swaps`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Amaliyot bajarilmadi");
        return;
      }
      setMsg(
        status === "ACCEPTED"
          ? "Smena qabul qilindi"
          : status === "DECLINED"
            ? "So'rov rad etildi"
            : "So'rov bekor qilindi",
      );
      await load();
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {!compact && (
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--dp-text)]">
            <ArrowLeftRight className="h-5 w-5 text-[var(--dp-accent)]" />
            Smena almashish
          </h2>
          <p className="mt-1 text-xs text-[var(--dp-muted)]">
            O&apos;z smenangizni boshqa xodimga bering yoki ochiq so&apos;rovni oling.
          </p>
        </div>
      )}

      <form
        onSubmit={createSwap}
        className="space-y-3 rounded-xl border p-3"
        style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
      >
        <p className="text-sm font-semibold text-[var(--dp-text)]">Yangi so&apos;rov</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs text-[var(--dp-muted)]">
            Boshlanish
            <input
              type="datetime-local"
              className="input mt-1 w-full text-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              required
            />
          </label>
          <label className="block text-xs text-[var(--dp-muted)]">
            Tugash
            <input
              type="datetime-local"
              className="input mt-1 w-full text-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              required
            />
          </label>
        </div>
        <label className="block text-xs text-[var(--dp-muted)]">
          Izoh (ixtiyoriy)
          <input
            className="input mt-1 w-full text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Masalan: ertalabki smena, oilaviy sabab..."
            maxLength={400}
          />
        </label>
        <button
          type="submit"
          className="btn btn-primary w-full sm:w-auto"
          disabled={submitting}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Yuborilmoqda…
            </span>
          ) : (
            "So'rov ochish"
          )}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["open", "Ochiq"],
            ["mine", "Mening"],
            ["all", "Hammasi"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filter === id
                ? "bg-[var(--dp-accent)] text-white"
                : "border border-[var(--dp-border)] text-[var(--dp-muted)] hover:opacity-90"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && (
        <p className="rounded-lg border border-[var(--dp-stat-amber-border)] bg-[var(--dp-accent-soft)] px-3 py-2 text-sm text-[var(--dp-text)]">
          {msg}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-300/50 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--dp-muted)]">Yuklanmoqda…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-[var(--dp-muted)]">Hozircha so&apos;rov yo&apos;q.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((s) => {
            const isMine = Boolean(userId && s.requesterId === userId);
            const canAccept =
              s.status === "OPEN" && userId && s.requesterId !== userId;
            const canCancel = s.status === "OPEN" && isMine;
            const busy = busyId === s.id;

            return (
              <li
                key={s.id}
                className="rounded-xl border px-3 py-3"
                style={{
                  borderColor: "var(--dp-border)",
                  background: "var(--dp-card)",
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--dp-text)]">
                      {s.requesterName}
                      {isMine ? " (siz)" : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--dp-muted)]">
                      {formatRange(s.fromDate, s.toDate)}
                    </p>
                    {s.note && (
                      <p className="mt-1 text-sm text-[var(--dp-text)]">{s.note}</p>
                    )}
                    <p className="mt-1 text-xs font-medium text-[var(--dp-accent)]">
                      {STATUS_LABEL[s.status]}
                      {s.status === "ACCEPTED" && s.acceptedByName
                        ? ` — ${s.acceptedByName}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {canAccept && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void patchStatus(s.id, "ACCEPTED")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Qabul
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void patchStatus(s.id, "DECLINED")}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--dp-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--dp-muted)] hover:opacity-90 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          Rad
                        </button>
                      </>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (!confirm("So'rovni bekor qilasizmi?")) return;
                          void patchStatus(s.id, "CANCELLED");
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-300/40 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:opacity-90 disabled:opacity-50"
                      >
                        Bekor
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

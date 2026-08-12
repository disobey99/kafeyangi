"use client";

import { useCallback, useEffect, useState } from "react";
import { UserRoundPen } from "lucide-react";

type WaiterOption = { id: string; name: string; role: string };

export function TableWaiterReassign({
  cafeId,
  tableId,
  currentWaiter,
  onChanged,
}: {
  cafeId: string;
  tableId: string;
  currentWaiter?: { id: string; name: string } | null;
  onChanged?: () => void;
}) {
  const [waiters, setWaiters] = useState<WaiterOption[]>([]);
  const [selected, setSelected] = useState(currentWaiter?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const loadWaiters = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafeId}/waiters`);
      if (!res.ok) return;
      const data = await res.json();
      setWaiters(data.waiters ?? []);
    } catch {
      /* ignore */
    }
  }, [cafeId]);

  useEffect(() => {
    void loadWaiters();
  }, [loadWaiters]);

  useEffect(() => {
    setSelected(currentWaiter?.id ?? "");
  }, [currentWaiter?.id, tableId]);

  async function submit() {
    if (!selected || selected === currentWaiter?.id) return;
    setBusy(true);
    setError("");
    setOkMsg("");
    try {
      const res = await fetch(`/api/tables/${tableId}/reassign-waiter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waiterUserId: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "O'tkazib bo'lmadi");
        return;
      }
      const name = data.assignedWaiter?.name ?? "ofitsiant";
      setOkMsg(`Stol ${name} ga biriktirildi`);
      onChanged?.();
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setBusy(false);
    }
  }

  if (waiters.length === 0) return null;

  const dirty = selected && selected !== (currentWaiter?.id ?? "");

  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
    >
      <div className="mb-2 flex items-center gap-2">
        <UserRoundPen className="h-4 w-4 text-[var(--dp-accent)]" />
        <p className="text-sm font-semibold text-[var(--dp-text)]">Ofitsiantni o&apos;zgartirish</p>
      </div>
      <p className="mb-2 text-xs text-[var(--dp-muted)]">
        Hozirgi:{" "}
        <strong className="text-[var(--dp-text)]">
          {currentWaiter?.name ?? "Biriktirilmagan"}
        </strong>
        . Kassir yoki menejer boshqa ofitsantga o&apos;tkazishi mumkin.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setError("");
            setOkMsg("");
          }}
          disabled={busy}
          className="input min-w-0 flex-1 text-sm"
        >
          <option value="">Ofitsiant tanlang</option>
          {waiters.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
              {w.role !== "WAITER" ? ` (${w.role === "MANAGER" ? "Menejer" : w.role === "OWNER" ? "Egasi" : w.role})` : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={() => void submit()}
          className="btn btn-primary shrink-0 px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy ? "..." : "Biriktirish"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      {okMsg && <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{okMsg}</p>}
    </div>
  );
}

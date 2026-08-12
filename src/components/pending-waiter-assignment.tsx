"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, UserPlus } from "lucide-react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import { debounce } from "@/lib/debounce";
import {
  formatWaiterWaitDuration,
  isWaiterAssignmentOverdue,
} from "@/lib/waiter-assignment-shared";

type PendingOrder = {
  id: string;
  orderNumber: number;
  createdAt: string;
  tableNumber: number;
  itemCount: number;
  overdue: boolean;
};

type WaiterOption = {
  userId: string;
  name: string;
};

const PENDING_TRANSLATIONS = {
  uz: {
    errorGeneric: "Xatolik",
    selectWaiterError: "Ofitsiantni tanlang",
    cashierTitle: "Ofitsiant qabul qilishi kutilmoqda",
    waiterTitle: "Yangi QR buyurtma — qabul qiling",
    cashierDesc: "Qabul qilinmaguncha ogohlantirish ekranda qoladi. 3 daqiqadan keyin ofitsiantni bog'lash mumkin.",
    waiterDesc: "Kim birinchi qabul qilsa, shu ofitsiantga bog'lanadi.",
    table: (n: number) => `Stol ${n}`,
    itemsCount: (n: number, wait: string) => `${n} ta mahsulot · kutish: ${wait}`,
    overdueAlert: "3 daqiqadan oshdi!",
    accept: "Qabul qilish",
    selectWaiterOption: "Ofitsiant tanlang",
    assign: "Bog'lash",
    waitingWaiter: "Ofitsiant kutilyapti…",
  },
  ru: {
    errorGeneric: "Ошибка",
    selectWaiterError: "Выберите официанта",
    cashierTitle: "Ожидается принятие официантом",
    waiterTitle: "Новый QR-заказ — примите его",
    cashierDesc: "Предупреждение останется на экране до принятия. Через 3 минуты можно назначить официанта.",
    waiterDesc: "Кто первым примет, тот и будет привязан к заказу.",
    table: (n: number) => `Стол ${n}`,
    itemsCount: (n: number, wait: string) => `${n} товар(ов) · ожидание: ${wait}`,
    overdueAlert: "Более 3 минут!",
    accept: "Принять",
    selectWaiterOption: "Выберите официанта",
    assign: "Назначить",
    waitingWaiter: "Ожидание официанта…",
  },
  en: {
    errorGeneric: "Error",
    selectWaiterError: "Select a waiter",
    cashierTitle: "Waiting for waiter acceptance",
    waiterTitle: "New QR order — accept it",
    cashierDesc: "The warning will stay on screen until accepted. After 3 minutes, you can assign a waiter.",
    waiterDesc: "The first waiter to accept will be assigned to the order.",
    table: (n: number) => `Table ${n}`,
    itemsCount: (n: number, wait: string) => `${n} item(s) · wait: ${wait}`,
    overdueAlert: "Over 3 minutes!",
    accept: "Accept",
    selectWaiterOption: "Select a waiter",
    assign: "Assign",
    waitingWaiter: "Waiting for waiter…",
  }
};

export function PendingWaiterAssignmentBanner({
  cafeId,
  mode,
  onNewPending,
  locale = "uz",
}: {
  cafeId: string;
  mode: "waiter" | "cashier";
  onNewPending?: () => void;
  locale?: "uz" | "ru" | "en";
}) {
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const [waiters, setWaiters] = useState<WaiterOption[]>([]);
  const [selectedWaiter, setSelectedWaiter] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const knownIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const t = PENDING_TRANSLATIONS[locale];

  const load = useCallback(async () => {
    const res = await fetch(`/api/cafes/${cafeId}/pending-waiter-assignments`);
    if (!res.ok) return;
    const data = await res.json();
    const next: PendingOrder[] = data.pending ?? [];

    for (const order of next) {
      if (!knownIds.current.has(order.id)) {
        knownIds.current.add(order.id);
        if (initialized.current) {
          onNewPending?.();
        }
      }
    }
    initialized.current = true;
    setPending(next);
  }, [cafeId, onNewPending]);

  const loadWaiters = useCallback(async () => {
    if (mode !== "cashier") return;
    const res = await fetch(`/api/cafes/${cafeId}/staff/active`);
    if (!res.ok) return;
    const data = await res.json();
    const list: WaiterOption[] = (data.activeStaff ?? [])
      .filter((s: { role: string }) => s.role === "WAITER")
      .map((s: { userId: string; name: string }) => ({
        userId: s.userId,
        name: s.name,
      }));
    setWaiters(list);
  }, [cafeId, mode]);

  useEffect(() => {
    load();
    loadWaiters();
  }, [load, loadWaiters]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadRef = useRef(load);
  loadRef.current = load;
  const loadDebounced = useRef(debounce(() => loadRef.current(), 400));

  useEffect(() => {
    return () => loadDebounced.current.cancel();
  }, []);

  useCafeRealtime(cafeId, (event) => {
    if (event.type === "order.created" || event.type === "order.updated") {
      loadDebounced.current();
    }
  });

  useEffect(() => {
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function acceptOrder(orderId: string) {
    setLoadingId(orderId);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/accept-waiter`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.errorGeneric);
        return;
      }
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  async function assignOrder(orderId: string) {
    const waiterUserId = selectedWaiter[orderId];
    if (!waiterUserId) {
      setError(t.selectWaiterError);
      return;
    }
    setLoadingId(orderId);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/assign-waiter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waiterUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.errorGeneric);
        return;
      }
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  if (pending.length === 0) return null;

  const hasOverdue = pending.some((p) => isWaiterAssignmentOverdue(p.createdAt, now));

  return (
    <div
      className={`mb-4 rounded-2xl border-2 p-4 shadow-lg ${
        hasOverdue
          ? "border-red-500/60 bg-red-500/10"
          : "border-amber-500/50 bg-amber-500/10"
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="mb-3 flex items-start gap-3">
        <AlertTriangle
          className={`mt-0.5 h-5 w-5 shrink-0 ${hasOverdue ? "text-red-500" : "text-amber-500"}`}
        />
        <div>
          <p className="font-bold text-[var(--dp-text)]">
            {mode === "cashier" ? t.cashierTitle : t.waiterTitle}
          </p>
          <p className="text-sm text-[var(--dp-muted)]">
            {mode === "cashier" ? t.cashierDesc : t.waiterDesc}
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {pending.map((order) => {
          const overdue = isWaiterAssignmentOverdue(order.createdAt, now);
          const waitLabel = formatWaiterWaitDuration(order.createdAt, now);
          const canAssign = mode === "cashier" && overdue;

          return (
            <li
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--dp-surface)] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-bold text-[var(--dp-text)]">
                  #{String(order.orderNumber).padStart(3, "0")} · {t.table(order.tableNumber)}
                </p>
                <p className="text-sm text-[var(--dp-muted)]">
                  {t.itemsCount(order.itemCount, waitLabel)}
                  {overdue && (
                    <span className="ml-2 font-semibold text-red-500">{t.overdueAlert}</span>
                  )}
                </p>
              </div>

              {mode === "waiter" ? (
                <button
                  type="button"
                  onClick={() => acceptOrder(order.id)}
                  disabled={loadingId === order.id}
                  className="btn btn-primary shrink-0 text-sm"
                >
                  <Check className="h-4 w-4" />
                  {loadingId === order.id ? "..." : t.accept}
                </button>
              ) : canAssign ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedWaiter[order.id] ?? ""}
                    onChange={(e) =>
                      setSelectedWaiter((prev) => ({
                        ...prev,
                        [order.id]: e.target.value,
                      }))
                    }
                    className="rounded-lg border border-[var(--dp-border)] bg-[var(--dp-bg)] px-3 py-2 text-sm text-[var(--dp-text)]"
                  >
                    <option value="">{t.selectWaiterOption}</option>
                    {waiters.map((w) => (
                      <option key={w.userId} value={w.userId}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => assignOrder(order.id)}
                    disabled={loadingId === order.id}
                    className="btn btn-primary shrink-0 text-sm"
                  >
                    <UserPlus className="h-4 w-4" />
                    {loadingId === order.id ? "..." : t.assign}
                  </button>
                </div>
              ) : (
                <span className="badge badge-brand shrink-0">{t.waitingWaiter}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

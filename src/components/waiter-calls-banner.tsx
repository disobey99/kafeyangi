"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import { debounce } from "@/lib/debounce";
import { vibrateWaiterCall } from "@/lib/waiter-call-alert";
import { dispatchWaiterCallAlert } from "@/lib/order-notifications";

type WaiterCall = {
  id: string;
  table: { number: number };
  createdAt: string;
};

const BANNER_TRANSLATIONS = {
  uz: {
    waiterCalled: "Ofitsiant chaqirildi!",
    table: (n: number) => `Stol ${n}`,
    seen: "Ko'rdim",
  },
  ru: {
    waiterCalled: "Вызов официанта!",
    table: (n: number) => `Стол ${n}`,
    seen: "ОК",
  },
  en: {
    waiterCalled: "Waiter called!",
    table: (n: number) => `Table ${n}`,
    seen: "Seen",
  }
};

export function WaiterCallsBanner({
  cafeId,
  onNewCall,
  locale = "uz",
}: {
  cafeId: string;
  onNewCall?: (tableNumber: number) => void;
  locale?: "uz" | "ru" | "en";
}) {
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const knownIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/cafes/${cafeId}/waiter-calls`);
    const data = await res.json();
    const nextCalls: WaiterCall[] = data.calls ?? [];

    for (const call of nextCalls) {
      if (!knownIds.current.has(call.id)) {
        knownIds.current.add(call.id);
        if (initialized.current) {
          vibrateWaiterCall();
          onNewCall?.(call.table.number);
          dispatchWaiterCallAlert(cafeId, call.table.number);
        }
      }
    }
    initialized.current = true;

    setCalls(nextCalls);
  }, [cafeId, onNewCall]);

  useEffect(() => {
    load();
  }, [load]);

  const loadRef = useRef(load);
  loadRef.current = load;
  const loadDebounced = useRef(debounce(() => loadRef.current(), 400));

  useEffect(() => {
    return () => loadDebounced.current.cancel();
  }, []);

  useCafeRealtime(cafeId, (event) => {
    if (event.type === "waiter.called" && initialized.current) {
      const payload = event.payload as { tableNumber?: number } | undefined;
      if (payload?.tableNumber != null) {
        vibrateWaiterCall();
        onNewCall?.(payload.tableNumber);
        dispatchWaiterCallAlert(cafeId, payload.tableNumber);
      }
    }
    if (event.type === "waiter.called" || event.type === "waiter.acknowledged") {
      loadDebounced.current();
    }
  });

  async function acknowledge(id: string) {
    await fetch(`/api/waiter-calls/${id}`, { method: "PATCH" });
    load();
  }

  if (calls.length === 0) return null;

  const t = BANNER_TRANSLATIONS[locale];

  return (
    <div className="mb-4 space-y-2">
      {calls.map((call) => (
        <div
          key={call.id}
          className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-semibold text-red-500">{t.waiterCalled}</p>
              <p className="text-sm text-red-400">{t.table(call.table.number)}</p>
            </div>
          </div>
          <button
            onClick={() => acknowledge(call.id)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            {t.seen}
          </button>
        </div>
      ))}
    </div>
  );
}

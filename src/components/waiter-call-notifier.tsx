"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import {
  isOrderSoundEnabled,
  dispatchWaiterCallAlert,
} from "@/lib/order-notifications";
import {
  isPushEnabledLocally,
  syncExistingPushSubscription,
} from "@/lib/push-client";
import { debounce } from "@/lib/debounce";
import {
  stopWaiterVibration,
  triggerWaiterCallAlert,
  vibrateWaiterCall,
} from "@/lib/waiter-call-alert";

type PendingCall = {
  id: string;
  tableNumber: number;
};

export function WaiterCallNotifier({ cafeId }: { cafeId: string }) {
  const [alert, setAlert] = useState<PendingCall | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());
  const seeded = useRef(false);
  const audioCtx = useRef<AudioContext | null>(null);
  const soundEnabledRef = useRef(false);

  useEffect(() => {
    const enabled = isOrderSoundEnabled();
    setSoundEnabled(enabled);
    soundEnabledRef.current = enabled;
    setPushEnabled(isPushEnabledLocally());
    if (enabled) audioCtx.current = new AudioContext();
    if (isPushEnabledLocally()) {
      syncExistingPushSubscription(cafeId).then((ok) => setPushEnabled(ok));
    }
  }, [cafeId]);

  useEffect(() => {
    function onAlertsEnabled() {
      const enabled = isOrderSoundEnabled();
      setSoundEnabled(enabled);
      soundEnabledRef.current = enabled;
      if (enabled && !audioCtx.current) audioCtx.current = new AudioContext();
      setPushEnabled(isPushEnabledLocally());
      if (isPushEnabledLocally()) {
        syncExistingPushSubscription(cafeId).then((ok) => setPushEnabled(ok));
      }
    }
    window.addEventListener("kafe:alerts-enabled", onAlertsEnabled);
    return () => window.removeEventListener("kafe:alerts-enabled", onAlertsEnabled);
  }, [cafeId]);

  const fireWaiterAlert = useCallback((tableNumber: number, callId: string) => {
    triggerWaiterCallAlert(
      tableNumber,
      soundEnabledRef.current ? audioCtx.current : null,
      soundEnabledRef.current,
    );
    dispatchWaiterCallAlert(cafeId, tableNumber);
    setAlert({ id: callId, tableNumber });
  }, [cafeId]);

  const syncCalls = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafeId}/waiter-calls`);
      const data = await res.json();
      const calls: { id: string; table: { number: number } }[] = data.calls ?? [];
      setPendingCount(calls.length);

      if (!seeded.current) {
        for (const call of calls) knownIds.current.add(call.id);
        seeded.current = true;
        if (calls.length > 0) {
          setAlert({ id: calls[0].id, tableNumber: calls[0].table.number });
        }
        return;
      }

      for (const call of calls) {
        if (!knownIds.current.has(call.id)) {
          knownIds.current.add(call.id);
          fireWaiterAlert(call.table.number, call.id);
        }
      }

      if (calls.length === 0) {
        setAlert(null);
        stopWaiterVibration();
      }
    } catch {
      // ignore
    }
  }, [cafeId, fireWaiterAlert]);

  useEffect(() => {
    syncCalls();
  }, [syncCalls]);

  const syncCallsRef = useRef(syncCalls);
  syncCallsRef.current = syncCalls;
  const syncCallsDebounced = useRef(debounce(() => syncCallsRef.current(), 400));

  useEffect(() => {
    return () => syncCallsDebounced.current.cancel();
  }, []);

  useCafeRealtime(cafeId, (event) => {
    if (event.type === "waiter.called" && seeded.current) {
      const payload = event.payload as { tableNumber?: number; callId?: string } | undefined;
      if (payload?.tableNumber != null) {
        fireWaiterAlert(payload.tableNumber, payload.callId ?? "live");
      }
    }
    if (event.type === "waiter.called" || event.type === "waiter.acknowledged") {
      syncCallsDebounced.current();
    }
  });

  useEffect(() => {
    if (pendingCount === 0) return;
    const timer = setInterval(() => vibrateWaiterCall(), 5000);
    return () => {
      clearInterval(timer);
      stopWaiterVibration();
    };
  }, [pendingCount]);

  const alertsReady = soundEnabled;

  async function acknowledge(id: string) {
    if (id !== "live") {
      await fetch(`/api/waiter-calls/${id}`, { method: "PATCH" });
    }
    stopWaiterVibration();
    syncCalls();
  }

  return (
    <>
      {alertsReady && pushEnabled && (
        <p className="fixed bottom-5 left-5 z-[55] rounded-full bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
          Fon signali yoqilgan
        </p>
      )}

      {alert && (
        <div className="fixed inset-x-4 top-4 z-[70] mx-auto max-w-md animate-pulse rounded-2xl border border-red-400/50 bg-red-600 px-5 py-4 text-white shadow-2xl sm:inset-x-auto sm:right-5 sm:top-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 h-6 w-6 shrink-0" />
              <div>
                <p className="text-sm font-semibold opacity-90">Ofitsiant chaqirildi!</p>
                <p className="text-3xl font-black">Stol {alert.tableNumber}</p>
                {pendingCount > 1 && (
                  <p className="mt-1 text-xs opacity-80">
                    + yana {pendingCount - 1} ta chaqiriq
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAlert(null)}
              className="rounded-lg p-1 opacity-80 hover:bg-white/20"
              aria-label="Yopish"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => acknowledge(alert.id)}
            className="mt-3 w-full rounded-xl bg-white/20 py-2.5 text-sm font-bold backdrop-blur transition hover:bg-white/30"
          >
            Ko&apos;rdim
          </button>
        </div>
      )}
    </>
  );
}

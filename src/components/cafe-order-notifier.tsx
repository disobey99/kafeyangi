"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, X } from "lucide-react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import { playNewOrderAlert } from "@/lib/new-order-alert";
import {
  dispatchNewOrderAlert,
  dispatchPendingOrders,
  enableOrderSound,
  isOrderSoundEnabled,
} from "@/lib/order-notifications";
import { debounce } from "@/lib/debounce";
import { triggerOrderAlert } from "@/lib/order-alert";

type OrderRow = {
  id: string;
  orderNumber: number;
  status: string;
  table: { number: number } | null;
};

type AlertInfo = {
  orderNumber: number;
  tableNumber?: number;
};

export function CafeOrderNotifier({
  cafeId,
  cafeName,
}: {
  cafeId: string;
  cafeName?: string;
}) {
  const pathname = usePathname();
  const onCashierPage = pathname?.startsWith(`/cashier/${cafeId}`);
  const [alert, setAlert] = useState<AlertInfo | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());
  const seeded = useRef(false);
  const audioCtx = useRef<AudioContext | null>(null);

  const soundEnabledRef = useRef(false);

  useEffect(() => {
    if (onCashierPage) return;
    const enabled = isOrderSoundEnabled();
    setSoundEnabled(enabled);
    soundEnabledRef.current = enabled;
    if (enabled) audioCtx.current = new AudioContext();
  }, [onCashierPage]);

  useEffect(() => {
    if (onCashierPage) return;
    function onAlertsEnabled() {
      const enabled = isOrderSoundEnabled();
      setSoundEnabled(enabled);
      soundEnabledRef.current = enabled;
      if (enabled && !audioCtx.current) audioCtx.current = new AudioContext();
    }
    window.addEventListener("kafe:alerts-enabled", onAlertsEnabled);
    return () => window.removeEventListener("kafe:alerts-enabled", onAlertsEnabled);
  }, [onCashierPage]);

  const playAlert = useCallback((orderNumber: number, tableNumber?: number) => {
    triggerOrderAlert(
      orderNumber,
      soundEnabledRef.current ? audioCtx.current : null,
      soundEnabledRef.current,
    );
    setAlert({ orderNumber, tableNumber });
    dispatchNewOrderAlert(cafeId, orderNumber, tableNumber);
  }, [cafeId]);

  const syncOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders?cafeId=${cafeId}`);
      const data = await res.json();
      const orders: OrderRow[] = data.orders ?? [];
      const pending = orders.filter((o) => o.status === "PENDING");
      dispatchPendingOrders(cafeId, pending.length);

      if (!seeded.current) {
        for (const order of pending) knownIds.current.add(order.id);
        seeded.current = true;
        return;
      }

      if (onCashierPage) return;

      for (const order of pending) {
        if (!knownIds.current.has(order.id)) {
          knownIds.current.add(order.id);
          playAlert(order.orderNumber, order.table?.number ?? undefined);
        }
      }
    } catch {
      // ignore
    }
  }, [cafeId, onCashierPage, playAlert]);

  useEffect(() => {
    if (onCashierPage) return;
    syncOrders();
  }, [syncOrders, onCashierPage]);

  const syncOrdersRef = useRef(syncOrders);
  syncOrdersRef.current = syncOrders;
  const syncOrdersDebounced = useRef(debounce(() => syncOrdersRef.current(), 400));

  useEffect(() => {
    return () => syncOrdersDebounced.current.cancel();
  }, []);

  useCafeRealtime(
    cafeId,
    (event) => {
      if (event.type === "order.created" && !onCashierPage && seeded.current) {
        const payload = event.payload as { orderId?: string; orderNumber?: number } | undefined;
        if (payload?.orderId) knownIds.current.add(payload.orderId);
        if (payload?.orderNumber != null) {
          playAlert(payload.orderNumber);
        }
      }
      if (event.type === "order.created" || event.type === "order.updated") {
        syncOrdersDebounced.current();
      }
    },
    { enabled: !onCashierPage },
  );

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setAlert(null), 12000);
    return () => clearTimeout(timer);
  }, [alert]);

  function handleEnableSound() {
    enableOrderSound();
    audioCtx.current = new AudioContext();
    setSoundEnabled(true);
    playNewOrderAlert(audioCtx.current, { withVoice: true });
  }

  if (onCashierPage) return null;

  return (
    <>
      {!soundEnabled && (
        <button
          type="button"
          onClick={handleEnableSound}
          className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
            boxShadow: "0 8px 24px rgba(217, 119, 6, 0.4)",
          }}
        >
          <Volume2 className="h-4 w-4" />
          Buyurtma ovozini yoqish
        </button>
      )}

      {alert && (
        <div
          className="fixed inset-x-4 top-4 z-[70] mx-auto max-w-md animate-pulse rounded-2xl border px-5 py-4 shadow-2xl sm:inset-x-auto sm:right-5 sm:top-5"
          style={{
            borderColor: "rgba(245, 158, 11, 0.5)",
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "#fff",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold opacity-90">Yangi buyurtma!</p>
              <p className="mt-0.5 text-2xl font-black">
                #{String(alert.orderNumber).padStart(3, "0")}
              </p>
              {alert.tableNumber != null && (
                <p className="mt-1 text-sm opacity-90">Stol {alert.tableNumber}</p>
              )}
              {cafeName && (
                <p className="mt-1 text-xs opacity-75">{cafeName}</p>
              )}
              <Link
                href={`/cashier/${cafeId}`}
                className="mt-3 inline-flex rounded-xl bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur transition hover:bg-white/30"
              >
                Kassaga o&apos;tish →
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setAlert(null)}
              className="rounded-lg p-1 opacity-80 transition hover:bg-white/20 hover:opacity-100"
              aria-label="Yopish"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

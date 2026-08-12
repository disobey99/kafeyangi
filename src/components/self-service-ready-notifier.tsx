"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { vibrateOrderAlert } from "@/lib/order-alert";
import type { MenuUiLabels } from "@/lib/menu-ui-labels";

type GuestOrder = {
  id: string;
  orderNumber: number;
  status: string;
  serviceMode: string;
};

function ackKey(orderId: string) {
  return `kafe-self-ready-ack:${orderId}`;
}

function isAcked(orderId: string) {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ackKey(orderId)) === "1";
}

function markAcked(orderId: string) {
  localStorage.setItem(ackKey(orderId), "1");
}

export function SelfServiceReadyNotifier({
  tableId,
  qrToken,
  visitToken,
  ui,
}: {
  tableId: string;
  qrToken: string;
  visitToken?: string | null;
  ui: MenuUiLabels;
}) {
  const [readyOrder, setReadyOrder] = useState<GuestOrder | null>(null);
  const prevStatus = useRef<Record<string, string>>({});
  const vibrateTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!visitToken) return;
    const params = new URLSearchParams({ token: qrToken, visitToken });
    const res = await fetch(`/api/tables/${tableId}/guest-session?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.sessionClosed) return;
    const orders: GuestOrder[] = data.activeOrders ?? [];

    for (const order of orders) {
      if (order.serviceMode !== "SELF") continue;
      const prev = prevStatus.current[order.id];
      prevStatus.current[order.id] = order.status;

      if (order.status === "READY" && !isAcked(order.id)) {
        if ((prev && prev !== "READY") || !prev) {
          setReadyOrder(order);
          return;
        }
      }
    }
  }, [tableId, qrToken, visitToken]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!readyOrder) {
      if (vibrateTimer.current) {
        clearInterval(vibrateTimer.current);
        vibrateTimer.current = null;
      }
      return;
    }

    vibrateOrderAlert();
    vibrateTimer.current = setInterval(() => vibrateOrderAlert(), 4000);

    return () => {
      if (vibrateTimer.current) {
        clearInterval(vibrateTimer.current);
        vibrateTimer.current = null;
      }
    };
  }, [readyOrder]);

  function confirmSeen() {
    if (!readyOrder) return;
    markAcked(readyOrder.id);
    setReadyOrder(null);
    window.dispatchEvent(new CustomEvent("kafe:self-ready-acked"));
  }

  if (!readyOrder) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
        role="alertdialog"
        aria-labelledby="self-ready-title"
        aria-describedby="self-ready-desc"
      >
        <p className="text-4xl" aria-hidden>
          🍽️
        </p>
        <h2 id="self-ready-title" className="mt-3 text-xl font-bold text-stone-900">
          {ui.readyConfirmTitle}
        </h2>
        <p id="self-ready-desc" className="mt-2 text-sm text-stone-600">
          {ui.readyConfirmMessage(
            String(readyOrder.orderNumber).padStart(3, "0"),
          )}
        </p>
        <button
          type="button"
          onClick={confirmSeen}
          className="mt-5 w-full rounded-xl bg-amber-600 py-3 font-semibold text-white"
        >
          {ui.readyConfirmButton}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
import type { MenuUiLabels } from "@/lib/menu-ui-labels";

type GuestOrder = {
  id: string;
  orderNumber: number;
  status: string;
  statusLabel: string;
  totalAmount: number;
  createdAt: string;
  items: { quantity: number; name: string }[];
};

const STATUS_HINTS: Record<string, string> = {
  PENDING: "Qabul qilinmoqda",
  CONFIRMED: "Tasdiqlandi",
  PREPARING: "Tayyorlanmoqda",
  READY: "Tayyor!",
  DELIVERED: "Yetkazildi / yopildi",
};

export function CustomerOrderHistory({
  tableId,
  qrToken,
  visitToken,
  ui,
  refreshKey = 0,
}: {
  tableId: string;
  qrToken: string;
  visitToken?: string | null;
  ui: MenuUiLabels;
  refreshKey?: number;
}) {
  const [history, setHistory] = useState<GuestOrder[]>([]);
  const [open, setOpen] = useState(true);

  const load = useCallback(async () => {
    if (!visitToken) {
      setHistory([]);
      return;
    }
    const params = new URLSearchParams({ token: qrToken, visitToken });
    const res = await fetch(`/api/tables/${tableId}/guest-session?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.sessionClosed) {
      setHistory([]);
      return;
    }
    const active: GuestOrder[] = data.activeOrders ?? [];
    const recent: GuestOrder[] = data.recentOrders ?? [];
    const activeIds = new Set(active.map((o) => o.id));
    const merged = [...active, ...recent.filter((o) => !activeIds.has(o.id))];
    setHistory(
      merged.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    );
  }, [tableId, qrToken, visitToken]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    function onCleared() {
      setHistory([]);
    }
    window.addEventListener("kafe:guest-session-cleared", onCleared);
    return () => {
      clearInterval(interval);
      window.removeEventListener("kafe:guest-session-cleared", onCleared);
    };
  }, [load, refreshKey]);

  if (history.length === 0) return null;

  return (
    <section className="border-b border-stone-200 bg-white px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-bold text-stone-800">{ui.orderHistory}</span>
        <span className="text-xs text-stone-400">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {history.map((order) => (
            <div key={order.id} className="rounded-xl border border-stone-100 bg-stone-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-amber-600">
                  #{String(order.orderNumber).padStart(3, "0")}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-600 ring-1 ring-stone-200">
                  {order.statusLabel}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-stone-500">
                {STATUS_HINTS[order.status] ?? order.statusLabel}
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-stone-600">
                {order.items.slice(0, 4).map((item, i) => (
                  <li key={i}>
                    {item.quantity}× {item.name}
                  </li>
                ))}
                {order.items.length > 4 && (
                  <li className="text-stone-400">+{order.items.length - 4} ta boshqa</li>
                )}
              </ul>
              <p className="mt-2 text-sm font-bold text-stone-800">
                {formatPrice(order.totalAmount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

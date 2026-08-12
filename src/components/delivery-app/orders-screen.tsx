"use client";

import { useEffect, useState } from "react";
import { OrderStatusTracker } from "@/components/order-status-tracker";
import { readSavedOrders } from "./storage";
import type { SavedDeliveryOrder } from "./types";
import type { MenuLocale } from "@/lib/menu-i18n";
import { getDeliveryUiLabels } from "@/lib/delivery-ui-labels";

export function DeliveryOrdersScreen({
  slug,
  cafeId,
  primaryColor,
  locale,
  refreshKey = 0,
  customerPhone,
}: {
  slug: string;
  cafeId?: string;
  primaryColor: string;
  locale: MenuLocale;
  refreshKey?: number;
  customerPhone?: string;
}) {
  const [orders, setOrders] = useState<SavedDeliveryOrder[]>([]);
  const ui = getDeliveryUiLabels(locale);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const local = readSavedOrders(slug);
      const byId = new Map<string, SavedDeliveryOrder>();
      for (const o of local) byId.set(o.id, o);

      if (cafeId && customerPhone && customerPhone.replace(/\D/g, "").length >= 9) {
        try {
          const res = await fetch(
            `/api/cafes/${cafeId}/app-orders?phone=${encodeURIComponent(customerPhone)}`,
          );
          if (res.ok) {
            const data = (await res.json()) as {
              orders?: Array<{
                id: string;
                orderNumber: number;
                createdAt: string;
              }>;
            };
            for (const o of data.orders ?? []) {
              byId.set(o.id, {
                id: o.id,
                orderNumber: o.orderNumber,
                createdAt: o.createdAt,
              });
            }
          }
        } catch {
          /* local yetarli */
        }
      }

      const merged = Array.from(byId.values()).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      if (!cancelled) setOrders(merged);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, cafeId, customerPhone, refreshKey]);

  if (orders.length === 0) {
    return (
      <div className="px-4 py-5" style={{ background: "var(--da-card)" }}>
        <h2 className="text-lg font-extrabold" style={{ color: "var(--da-ink)" }}>
          {ui.ordersTab}
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--da-muted)" }}>
          {ui.noOrdersYet}
        </p>
      </div>
    );
  }

  const dateLocale = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ";

  return (
    <div className="space-y-4 px-3 py-4" style={{ background: "var(--da-surface)" }}>
      <h2 className="px-1 text-lg font-extrabold" style={{ color: "var(--da-ink)" }}>
        {ui.ordersTab}
      </h2>
      {orders.map((order) => (
        <div
          key={order.id}
          className="overflow-hidden rounded-2xl shadow-md"
          style={{
            background: "var(--da-card)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          <OrderStatusTracker
            orderId={order.id}
            accent={primaryColor}
            reviewPhone={customerPhone}
            locale={locale}
          />
          <p
            className="border-t px-4 py-2 text-center text-[11px] font-medium"
            style={{ borderColor: "var(--da-border)", color: "var(--da-muted)" }}
          >
            #{String(order.orderNumber).padStart(3, "0")} ·{" "}
            {new Date(order.createdAt).toLocaleString(dateLocale)}
          </p>
        </div>
      ))}
    </div>
  );
}

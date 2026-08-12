"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChefHat, Printer, ArrowLeftRight } from "lucide-react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import { ShiftSwapPanel } from "@/components/shift-swap-panel";
import { debounce } from "@/lib/debounce";
import {
  getAutoPrintKitchen,
  getKitchenPrintedIds,
  kitchenPrintKey,
  printKitchenReceipt,
  printKitchenReceiptForce,
  saveKitchenPrintedIds,
  setAutoPrintKitchen,
  type KitchenReceiptData,
} from "@/lib/receipt-print";
import { ORDER_STATUS_LABELS, ORDER_TYPE_LABELS, orderCreatorLabel } from "@/lib/utils";

type PrepStation = {
  id: string;
  name: string;
  isDefault: boolean;
};

type OrderItem = {
  id: string;
  quantity: number;
  status: string;
  prepStationId: string | null;
  prepStationName: string | null;
  product: { name: string };
};

type Order = {
  id: string;
  orderNumber: number;
  status: string;
  type: string;
  source: string;
  notes: string | null;
  createdAt: string;
  table: { number: number } | null;
  customerPhone: string | null;
  createdBy: { name: string } | null;
  items: OrderItem[];
};

const STATION_STORAGE = "kafe_kitchen_station";

function stationItems(order: Order, stationId: string | null, defaultStationId: string | null) {
  if (!stationId) return order.items;
  return order.items.filter((i) => {
    if (i.prepStationId === stationId) return true;
    if (!i.prepStationId && defaultStationId === stationId) return true;
    return false;
  });
}

function activeStationItems(items: OrderItem[]) {
  return items.filter((i) => !["READY", "DELIVERED", "CANCELLED"].includes(i.status));
}

export function KitchenPanel({
  cafeId,
  cafeName,
  userId,
}: {
  cafeId: string;
  cafeName: string;
  userId?: string;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stations, setStations] = useState<PrepStation[]>([]);
  const [stationId, setStationId] = useState<string | null>(null);
  const [autoPrint, setAutoPrint] = useState(true);
  const [swapOpen, setSwapOpen] = useState(false);
  const printedIds = useRef<Set<string>>(new Set());
  const seedWithoutPrint = useRef(false);
  const printReady = useRef(false);

  const defaultStationId = useMemo(
    () => stations.find((s) => s.isDefault)?.id ?? stations[0]?.id ?? null,
    [stations],
  );

  const selectedStation = useMemo(
    () => stations.find((s) => s.id === stationId) ?? null,
    [stations, stationId],
  );

  useEffect(() => {
    setAutoPrint(getAutoPrintKitchen());
    const stored = getKitchenPrintedIds(cafeId);
    printedIds.current = stored;
    seedWithoutPrint.current = stored.size === 0;
    printReady.current = true;

    const savedStation = localStorage.getItem(`${STATION_STORAGE}:${cafeId}`);
    if (savedStation) setStationId(savedStation);
  }, [cafeId]);

  useEffect(() => {
    fetch(`/api/cafes/${cafeId}/prep-stations`)
      .then((r) => r.json())
      .then((data) => {
        const list = (data.stations ?? []) as PrepStation[];
        setStations(list);
        setStationId((prev) => {
          if (prev && list.some((s) => s.id === prev)) return prev;
          const saved = localStorage.getItem(`${STATION_STORAGE}:${cafeId}`);
          if (saved && list.some((s) => s.id === saved)) return saved;
          return list.find((s) => s.isDefault)?.id ?? list[0]?.id ?? null;
        });
      })
      .catch(() => {});
  }, [cafeId]);

  function selectStation(id: string) {
    setStationId(id);
    localStorage.setItem(`${STATION_STORAGE}:${cafeId}`, id);
  }

  function orderToReceipt(order: Order, items: OrderItem[]): KitchenReceiptData {
    return {
      cafeName,
      orderNumber: order.orderNumber,
      tableNumber: order.table?.number,
      stationName: selectedStation?.name,
      items: items.map((i) => ({ quantity: i.quantity, name: i.product.name })),
      notes: order.notes,
      createdAt: order.createdAt,
    };
  }

  function autoPrintNewOrders(nextOrders: Order[], currentStationId: string | null) {
    if (!printReady.current || !currentStationId) return;
    let changed = false;
    for (const order of nextOrders) {
      if (order.status !== "CONFIRMED" && order.status !== "PREPARING") continue;
      const items = activeStationItems(stationItems(order, currentStationId, defaultStationId));
      if (items.length === 0) continue;

      const confirmedItems = items.filter((i) => i.status === "CONFIRMED");
      const toPrint = confirmedItems.filter((i) => !printedIds.current.has(`item:${i.id}`));
      if (toPrint.length === 0) continue;

      const stationKey = kitchenPrintKey(order.id, currentStationId);
      const legacyPrinted =
        printedIds.current.has(stationKey) || printedIds.current.has(order.id);

      // Birinchi ochilish yoki eski kalit: chop etmasdan itemlarni belgilaymiz
      if (seedWithoutPrint.current || legacyPrinted) {
        for (const item of toPrint) {
          printedIds.current.add(`item:${item.id}`);
        }
        printedIds.current.delete(stationKey);
        printedIds.current.delete(order.id);
        changed = true;
        continue;
      }

      for (const item of toPrint) {
        printedIds.current.add(`item:${item.id}`);
      }
      changed = true;
      if (getAutoPrintKitchen()) {
        printKitchenReceipt(orderToReceipt(order, toPrint));
      }
    }
    if (seedWithoutPrint.current) {
      seedWithoutPrint.current = false;
      changed = true;
    }
    if (changed) saveKitchenPrintedIds(cafeId, printedIds.current);
  }

  const fetchOrders = useCallback(async () => {
    const res = await fetch(`/api/orders?cafeId=${cafeId}`);
    const data = await res.json();
    const filtered = (data.orders ?? []).filter((o: Order) =>
      ["CONFIRMED", "PREPARING"].includes(o.status),
    );
    autoPrintNewOrders(filtered, stationId);
    setOrders(filtered);
  }, [cafeId, cafeName, stationId, defaultStationId, selectedStation?.name]);

  const fetchOrdersRef = useRef(fetchOrders);
  fetchOrdersRef.current = fetchOrders;
  const fetchOrdersDebounced = useRef(debounce(() => fetchOrdersRef.current(), 400));

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    function onSynced() {
      fetchOrdersRef.current();
    }
    window.addEventListener("kafe:synced", onSynced);
    window.addEventListener("online", onSynced);
    return () => {
      window.removeEventListener("kafe:synced", onSynced);
      window.removeEventListener("online", onSynced);
    };
  }, []);

  useEffect(() => {
    return () => fetchOrdersDebounced.current.cancel();
  }, []);

  useCafeRealtime(cafeId, (event) => {
    if (event.type === "order.created" || event.type === "order.updated") {
      fetchOrdersDebounced.current();
    }
  });

  const visibleOrders = useMemo(() => {
    return orders
      .map((order) => {
        const items = activeStationItems(stationItems(order, stationId, defaultStationId));
        return { order, items };
      })
      .filter(({ items }) => items.length > 0);
  }, [orders, stationId, defaultStationId]);

  async function updateStationStatus(orderId: string, status: "PREPARING" | "READY") {
    if (!stationId) return;
    const prev = orders;

    setOrders((list) =>
      list.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          items: o.items.map((item) => {
            const mine =
              item.prepStationId === stationId ||
              (!item.prepStationId && defaultStationId === stationId);
            if (!mine || ["READY", "CANCELLED", "DELIVERED"].includes(item.status)) {
              return item;
            }
            return { ...item, status };
          }),
          status: status === "PREPARING" ? "PREPARING" : o.status,
        };
      }),
    );

    try {
      const res = await fetch(`/api/orders/${orderId}/station`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId, status }),
      });
      if (!res.ok) {
        setOrders(prev);
        fetchOrdersDebounced.current();
      } else {
        fetchOrdersDebounced.current();
      }
    } catch {
      setOrders(prev);
      fetchOrdersDebounced.current();
    }
  }

  const title = selectedStation?.name ?? "Oshxona";

  return (
    <div>
      <div className="dp-card mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--dp-text)]">{title}</h1>
          <p className="text-sm text-[var(--dp-muted)]">
            Faqat shu stansiyaga tegishli buyurtmalar
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !autoPrint;
              setAutoPrint(next);
              setAutoPrintKitchen(next);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
              autoPrint
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-[var(--dp-border)] text-[var(--dp-muted)]"
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            Avto chop {autoPrint ? "yoq" : "o'ch"}
          </button>
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-500">
            Real vaqt
          </span>
        </div>
      </div>

      <div className="mb-4">
        <button
          type="button"
          onClick={() => setSwapOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold text-[var(--dp-text)] transition hover:opacity-90"
          style={{ borderColor: "var(--dp-border)", background: "var(--dp-card)" }}
        >
          <ArrowLeftRight className="h-4 w-4 text-[var(--dp-accent)]" />
          Smena almashish
        </button>
        {swapOpen && (
          <div
            className="mt-3 rounded-2xl border p-4"
            style={{ borderColor: "var(--dp-border)", background: "var(--dp-card)" }}
          >
            <ShiftSwapPanel cafeId={cafeId} userId={userId} />
          </div>
        )}
      </div>

      {stations.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {stations.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectStation(s.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                stationId === s.id
                  ? "bg-[var(--dp-accent)] text-white"
                  : "bg-[var(--dp-card)] text-[var(--dp-muted)] ring-1 ring-[var(--dp-border)] hover:text-[var(--dp-text)]"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {visibleOrders.length === 0 ? (
        <div className="dp-card rounded-2xl p-16 text-center">
          <ChefHat className="mx-auto h-10 w-10 text-[var(--dp-muted)] opacity-50" />
          <p className="mt-4 text-[var(--dp-muted)]">Hozircha buyurtmalar yo&apos;q</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleOrders.map(({ order, items }) => {
            const hasConfirmed = items.some((i) => i.status === "CONFIRMED");
            const hasPreparing = items.some((i) => i.status === "PREPARING");
            return (
              <div key={order.id} className="dp-card rounded-2xl p-5">
                <div className="flex justify-between gap-2">
                  <span className="text-3xl font-bold text-[var(--dp-accent)]">
                    #{String(order.orderNumber).padStart(3, "0")}
                  </span>
                  {order.table ? (
                    <span className="text-lg text-[var(--dp-muted)]">Stol {order.table.number}</span>
                  ) : (
                    <span className="text-sm text-blue-400">
                      {ORDER_TYPE_LABELS[order.type]}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--dp-muted)]">
                  {ORDER_STATUS_LABELS[order.status]}
                  <span className="mx-1">·</span>
                  {orderCreatorLabel(order)}
                </p>
                <ul className="mt-4 space-y-2 text-[var(--dp-subtle)]">
                  {items.map((item) => (
                    <li key={item.id} className="text-lg font-medium">
                      {item.quantity}x {item.product.name}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => printKitchenReceiptForce(orderToReceipt(order, items))}
                    className="rounded-xl border border-[var(--dp-border)] px-3 py-2.5 text-sm text-[var(--dp-muted)] hover:text-[var(--dp-text)]"
                    title="Chekni qayta chop etish"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                  {hasConfirmed && (
                    <button
                      onClick={() => updateStationStatus(order.id, "PREPARING")}
                      className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      Boshlash
                    </button>
                  )}
                  {hasPreparing && (
                    <button
                      onClick={() => updateStationStatus(order.id, "READY")}
                      className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Tayyor
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

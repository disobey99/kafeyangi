"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playNewOrderAlert } from "@/lib/new-order-alert";
import { debounce } from "@/lib/debounce";
import {
  disableOrderSound,
  enableOrderSound,
  isOrderSoundEnabled,
} from "@/lib/order-notifications";
import { triggerWaiterCallAlert } from "@/lib/waiter-call-alert";
import { WaiterCallsBanner } from "@/components/waiter-calls-banner";
import { PendingWaiterAssignmentBanner } from "@/components/pending-waiter-assignment";
import { TableCheckout } from "@/components/table-checkout";
import { StaffFloorView } from "@/components/staff-floor-view";
import { CashierCounterOrder } from "@/components/cashier-counter-order";
import { useOffline } from "@/hooks/use-offline";
import {
  addPendingAction,
  getOrdersCache,
  saveOrdersCache,
} from "@/lib/offline-store";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import { useHardwareBackHandler } from "@/hooks/use-hardware-back";
import { ReceiptPrintSettings } from "@/components/receipt-print-settings";
import { StaffAlertLocalePicker } from "@/components/staff-alert-locale-picker";
import { MenuSetupBanner } from "@/components/menu-setup-banner";
import { Bell, BellOff, ClipboardList, History, Inbox, LayoutGrid, Printer, ShoppingBag, Wallet } from "lucide-react";
import { WaiterHistory } from "@/components/waiter-history";
import { CashierZClose } from "@/components/cashier-z-close";
import {
  getAutoPrintKitchen,
  printKitchenReceiptForce,
  printMultipleKitchenReceipts,
  shouldPrintKitchenOnCashier,
  splitKitchenReceiptsByStation,
  type KitchenReceiptData,
} from "@/lib/receipt-print";
import { formatPrice, ORDER_STATUS_LABELS, ORDER_TYPE_LABELS, orderCreatorLabel } from "@/lib/utils";
import {
  groupOrdersByTable,
  orderHasNewItems,
  orderNeedsCashierAction,
} from "@/lib/cashier-orders";

type Order = {
  id: string;
  orderNumber: number;
  status: string;
  type: string;
  source: string;
  totalAmount: number;
  notes: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  createdAt: string;
  table: { number: number } | null;
  createdBy: { name: string } | null;
  items: {
    id: string;
    quantity: number;
    isNewAddition?: boolean;
    prepStationId?: string | null;
    prepStationName?: string | null;
    product: { name: string };
  }[];
};

type AlertInfo = {
  orderNumber: number;
  tableNumber?: number;
  isAddition?: boolean;
};

type WaiterAlertInfo = {
  tableNumber: number;
};

type CashierTab = "floor" | "counter" | "orders" | "table" | "history" | "zclose";

export function CashierPanel({
  cafeId,
  cafeName,
  productCount = 0,
  cashierOnly = false,
}: {
  cafeId: string;
  cafeName: string;
  productCount?: number;
  cashierOnly?: boolean;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [bulkAccepting, setBulkAccepting] = useState(false);
  const [tab, setTab] = useState<CashierTab>("floor");
  const [checkoutTableNumber, setCheckoutTableNumber] = useState<number | null>(null);
  const [checkoutPreselectKey, setCheckoutPreselectKey] = useState(0);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertInfo | null>(null);
  const [waiterAlert, setWaiterAlert] = useState<WaiterAlertInfo | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const knownAdditions = useRef<Set<string>>(new Set());
  const audioCtx = useRef<AudioContext | null>(null);
  const soundEnabledRef = useRef(false);
  const { online } = useOffline();

  async function toggleSound() {
    if (soundEnabledRef.current) {
      disableOrderSound();
      soundEnabledRef.current = false;
      setSoundEnabled(false);
      if (audioCtx.current) {
        void audioCtx.current.suspend();
      }
      return;
    }

    enableOrderSound();
    const { requestStaffNotificationPermission } = await import(
      "@/lib/staff-local-notify"
    );
    await requestStaffNotificationPermission();
    if (!audioCtx.current) {
      audioCtx.current = new AudioContext();
    }
    if (audioCtx.current.state === "suspended") {
      await audioCtx.current.resume();
    }
    soundEnabledRef.current = true;
    setSoundEnabled(true);
    playNewOrderAlert(audioCtx.current, { withVoice: true });
  }

  async function ensureAudioContext() {
    if (!soundEnabledRef.current) return null;
    if (!audioCtx.current) {
      audioCtx.current = new AudioContext();
    }
    if (audioCtx.current.state === "suspended") {
      try {
        await audioCtx.current.resume();
      } catch {
        return null;
      }
    }
    return audioCtx.current;
  }

  function notifyNewOrder(order: Order, isAddition = false) {
    const needsWaiterAccept =
      order.source === "QR_TABLE" && !order.createdBy && !isAddition;

    if (soundEnabledRef.current) {
      void ensureAudioContext().then((ctx) => {
        if (!ctx) return;
        playNewOrderAlert(ctx, {
          orderNumber: order.orderNumber,
          withVoice: true,
        });
      });
    }

    if (needsWaiterAccept) return;

    setAlert({
      orderNumber: order.orderNumber,
      tableNumber: order.table?.number,
      isAddition,
    });
  }

  function trackOrderNotifications(orderList: Order[]) {
    for (const order of orderList) {
      if (order.status === "PENDING" && !knownIds.current.has(order.id)) {
        knownIds.current.add(order.id);
        notifyNewOrder(order, false);
        continue;
      }

      const newItemIds = order.items
        .filter((i) => i.isNewAddition)
        .map((i) => i.id)
        .sort()
        .join(",");
      if (!newItemIds) continue;

      const additionKey = `${order.id}:${newItemIds}`;
      if (!knownAdditions.current.has(additionKey)) {
        knownAdditions.current.add(additionKey);
        notifyNewOrder(order, true);
      }
    }
  }

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setAlert(null), 6000);
    return () => clearTimeout(timer);
  }, [alert]);

  useEffect(() => {
    if (!waiterAlert) return;
    const timer = setTimeout(() => setWaiterAlert(null), 8000);
    return () => clearTimeout(timer);
  }, [waiterAlert]);

  function notifyWaiterCall(tableNumber: number) {
    void ensureAudioContext().then((ctx) => {
      triggerWaiterCallAlert(tableNumber, ctx, soundEnabledRef.current);
    });
    setWaiterAlert({ tableNumber });
  }

  useEffect(() => {
    if (!isOrderSoundEnabled()) return;
    // Brauzer gesture kutadi — faqat holatni tiklaymiz, AudioContext tugmada ochiladi
    soundEnabledRef.current = true;
    setSoundEnabled(true);
  }, []);

  useEffect(() => {
    return () => {
      void audioCtx.current?.close();
      audioCtx.current = null;
    };
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders?cafeId=${cafeId}`);
      const data = await res.json();
      const newOrders: Order[] = data.orders ?? [];

      if (newOrders.length > 0 || res.ok) {
        await saveOrdersCache(cafeId, newOrders);
      }

      trackOrderNotifications(newOrders);

      setOrders(newOrders);
    } catch {
      const cached = await getOrdersCache(cafeId);
      if (cached) setOrders(cached as Order[]);
    }
  }, [cafeId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    function onSynced() {
      fetchOrders();
    }
    window.addEventListener("kafe:synced", onSynced);
    return () => window.removeEventListener("kafe:synced", onSynced);
  }, [fetchOrders]);

  const fetchOrdersRef = useRef(fetchOrders);
  fetchOrdersRef.current = fetchOrders;
  const fetchOrdersDebounced = useRef(debounce(() => fetchOrdersRef.current(), 400));

  useEffect(() => {
    return () => fetchOrdersDebounced.current.cancel();
  }, []);

  useCafeRealtime(cafeId, (event) => {
    if (event.type === "order.created" || event.type === "order.updated") {
      fetchOrdersDebounced.current();
    }
  });

  function orderToKitchenReceipts(order: Order, newItemsOnly = false): KitchenReceiptData[] {
    return splitKitchenReceiptsByStation(
      {
        cafeName,
        orderNumber: order.orderNumber,
        tableNumber: order.table?.number,
        notes: order.notes,
        createdAt: order.createdAt,
      },
      order.items.map((i) => ({
        quantity: i.quantity,
        name: i.product.name,
        prepStationId: i.prepStationId,
        prepStationName: i.prepStationName,
        isNewAddition: i.isNewAddition,
      })),
      newItemsOnly,
    );
  }

  async function acceptOrder(displayOrder: Order, options?: { skipPrint?: boolean }) {
    const targets = displayOrder.table
      ? orders.filter(
          (o) =>
            o.table?.number === displayOrder.table!.number &&
            orderNeedsCashierAction(o),
        )
      : [displayOrder];

    for (const order of targets) {
      const hasNew = orderHasNewItems(order.items);
      const newOnly = hasNew && order.status !== "PENDING";
      // Offline'da oshxona cheki kassada chiqmasin — oshxona stansiyasi chop etadi
      if (shouldPrintKitchenOnCashier(online) && !options?.skipPrint) {
        const receipts = orderToKitchenReceipts(order, newOnly);
        if (receipts.length > 0) {
          printMultipleKitchenReceipts(receipts);
        }
      }
    }

    // Parallel + optimistic — ketma-ket await yo'q
    await Promise.all(targets.map((order) => updateStatus(order.id, "CONFIRMED")));
  }

  async function acceptAllPending() {
    const pendingIds = new Set<string>();
    for (const displayOrder of displayOrders.filter(orderNeedsCashierAction)) {
      if (displayOrder.table) {
        for (const o of orders) {
          if (
            o.table?.number === displayOrder.table!.number &&
            orderNeedsCashierAction(o)
          ) {
            pendingIds.add(o.id);
          }
        }
      } else {
        pendingIds.add(displayOrder.id);
      }
    }
    const pending = orders.filter((o) => pendingIds.has(o.id));
    if (pending.length === 0 || bulkAccepting) return;

    setBulkAccepting(true);
    try {
      if (shouldPrintKitchenOnCashier(online)) {
        printMultipleKitchenReceipts(
          pending.flatMap((order) => {
            const hasNew = orderHasNewItems(order.items);
            const newOnly = hasNew && order.status !== "PENDING";
            return orderToKitchenReceipts(order, newOnly);
          }),
        );
      }

      const ids = new Set(pending.map((o) => o.id));
      // Darhol UI
      setOrders((prev) =>
        prev.map((o) => (ids.has(o.id) ? { ...o, status: "CONFIRMED" } : o)),
      );

      if (online) {
        const results = await Promise.all(
          pending.map((order) =>
            fetch(`/api/orders/${order.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "CONFIRMED" }),
            }),
          ),
        );
        if (results.some((r) => !r.ok)) {
          fetchOrdersDebounced.current();
        }
      } else {
        for (const order of pending) {
          await addPendingAction({
            type: "ORDER_STATUS",
            payload: { orderId: order.id, status: "CONFIRMED" },
          });
        }
      }
    } finally {
      setBulkAccepting(false);
    }
  }

  const displayOrders = useMemo(() => groupOrdersByTable(orders), [orders]);

  const pendingCount = displayOrders.filter(orderNeedsCashierAction).length;

  async function updateStatus(id: string, status: string) {
    const snapshot = orders;
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o)),
    );

    if (!online) {
      try {
        await addPendingAction({
          type: "ORDER_STATUS",
          payload: { orderId: id, status },
        });
      } catch {
        setOrders(snapshot);
      }
      return;
    }

    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setOrders(snapshot);
        fetchOrdersDebounced.current();
      }
    } catch {
      setOrders(snapshot);
      fetchOrdersDebounced.current();
    }
  }

  function openTableFromFloor(table: { id: string; number: number }) {
    setSelectedTableId(table.id);
    setCheckoutTableNumber(table.number);
    setCheckoutPreselectKey((k) => k + 1);
    setTab("table");
  }

  function openTableFromOrder(tableNumber: number) {
    setCheckoutTableNumber(tableNumber);
    setCheckoutPreselectKey((k) => k + 1);
    setTab("table");
  }

  useHardwareBackHandler(() => {
    if (alert) {
      setAlert(null);
      return true;
    }
    if (waiterAlert) {
      setWaiterAlert(null);
      return true;
    }
    if (tab === "table" || checkoutTableNumber != null || selectedTableId) {
      setTab("floor");
      setCheckoutTableNumber(null);
      setSelectedTableId(null);
      return true;
    }
    if (tab !== "floor") {
      setTab("floor");
      return true;
    }
    return false;
  });

  const tabs: { id: CashierTab; label: string; icon: typeof LayoutGrid; badge?: number }[] = [
    { id: "floor", label: "Zal", icon: LayoutGrid },
    { id: "counter", label: "Kassadan savdo", icon: ShoppingBag },
    { id: "orders", label: "Buyurtmalar", icon: Inbox, badge: pendingCount || undefined },
    { id: "table", label: "Stol tahriri", icon: Wallet },
    { id: "history", label: "Tarix", icon: History },
    { id: "zclose", label: "Kun yopish", icon: ClipboardList },
  ];

  return (
    <div className="min-w-0">
      {waiterAlert && (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-lg animate-pulse rounded-2xl bg-red-500 px-6 py-4 text-center text-white shadow-xl">
          <p className="text-lg font-bold">Ofitsiant chaqirildi!</p>
          <p className="mt-1 text-3xl font-black">Stol {waiterAlert.tableNumber}</p>
        </div>
      )}

      {alert && (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-lg animate-pulse rounded-2xl bg-amber-500 px-6 py-4 text-center text-white shadow-xl">
          <p className="text-lg font-bold">Yangi buyurtma!</p>
          <p className="mt-1 text-3xl font-black">
            #{String(alert.orderNumber).padStart(3, "0")}
          </p>
          {alert.tableNumber != null && (
            <p className="mt-1 text-sm text-amber-100">Stol {alert.tableNumber}</p>
          )}
          {alert.isAddition && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-100">
              Yangi qo&apos;shimcha
            </p>
          )}
        </div>
      )}

      <div className="dp-card cashier-panel-header mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 sm:mb-4 sm:p-5">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--dp-text)] sm:text-2xl">
            Kassa
          </h1>
          <p className="truncate text-sm text-[var(--dp-muted)]">{cafeName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StaffAlertLocalePicker compact className="mr-1" />
          <button
            type="button"
            onClick={() => void toggleSound()}
            className={`cashier-sound-toggle ${soundEnabled ? "is-on" : "is-off"}`}
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? "Ovozni o'chirish" : "Ovozni yoqish"}
            title={soundEnabled ? "Ovoz yoqilgan — o'chirish" : "Ovoz o'chiq — yoqish"}
          >
            {soundEnabled ? (
              <Bell className="h-5 w-5" strokeWidth={2.25} fill="currentColor" />
            ) : (
              <BellOff className="h-5 w-5" strokeWidth={2.25} />
            )}
          </button>
          <span className="badge badge-green cashier-panel-live-badge">Real vaqt</span>
          {!online && <span className="badge badge-brand">Offline</span>}
        </div>
      </div>

      <WaiterCallsBanner cafeId={cafeId} onNewCall={notifyWaiterCall} />

      <PendingWaiterAssignmentBanner cafeId={cafeId} mode="cashier" />

      {!cashierOnly && (
        <div className="mb-4">
          <MenuSetupBanner cafeId={cafeId} productCount={productCount} />
        </div>
      )}

      <details className="dp-card mb-4 rounded-2xl p-4">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--dp-text)]">
          Chek sozlamalari
        </summary>
        <div className="mt-3">
          <ReceiptPrintSettings />
        </div>
      </details>

      {!soundEnabled && (
        <p className="cashier-sound-hint mb-3 rounded-xl px-4 py-3 text-sm sm:mb-4">
          Yangi buyurtma signalini eshitish uchun yuqoridagi qo&apos;ng&apos;iroqcha
          tugmasini bosing.
        </p>
      )}

      <nav className="cashier-panel-tabs mb-3 flex gap-2 overflow-x-auto pb-1 sm:mb-4 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`cashier-tab shrink-0 ${tab === id ? "cashier-tab-active" : ""}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
            {badge != null && badge > 0 && (
              <span className="rounded-full bg-[var(--dp-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {tab === "floor" && (
        <div className="space-y-4">
          <StaffFloorView
            cafeId={cafeId}
            cafeName={cafeName}
            variant="cashier"
            selectedTableId={selectedTableId}
            onTableSelect={openTableFromFloor}
          />
          <p className="text-center text-sm text-[var(--dp-muted)]">
            Stolni bosib — tahrirlash va to&apos;lov uchun &quot;Stol / To&apos;lov&quot; bo&apos;limiga o&apos;tasiz
          </p>
        </div>
      )}

      {tab === "counter" && (
        <CashierCounterOrder
          cafeId={cafeId}
          cafeName={cafeName}
          onOrderCreated={fetchOrders}
        />
      )}

      {tab === "table" && (
        <TableCheckout
          cafeId={cafeId}
          cafeName={cafeName}
          onClosed={fetchOrders}
          preselectTableNumber={checkoutTableNumber}
          preselectKey={checkoutPreselectKey}
          defaultView="edit"
          onPreselectHandled={() => setCheckoutTableNumber(null)}
        />
      )}

      {tab === "history" && (
        <WaiterHistory cafeId={cafeId} cafeName={cafeName} locale="uz" />
      )}

      {tab === "zclose" && (
        <CashierZClose cafeId={cafeId} cafeName={cafeName} />
      )}

      {tab === "orders" && (
        <div>
          {pendingCount > 0 && (
            <div
              className="mb-4 flex min-w-0 flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              style={{
                borderColor: "var(--dp-accent)",
                background: "var(--dp-accent-soft)",
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--dp-text)]">
                  {pendingCount} ta yangi / kutilayotgan buyurtma
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--dp-muted)]">
                  {getAutoPrintKitchen()
                    ? "Online / kassa buyurtmalari — qabul qiling. Ofitsiant va stol QR oshxonaga o'zi ketadi."
                    : "Avto chop o'chiq — faqat qabul qilinadi (Chek sozlamalaridan yoqing)"}
                </p>
              </div>
              <button
                type="button"
                onClick={acceptAllPending}
                disabled={bulkAccepting}
                className="btn btn-primary w-full shrink-0 px-4 py-2.5 text-sm sm:w-auto"
              >
                {bulkAccepting
                  ? "Yuborilmoqda..."
                  : getAutoPrintKitchen()
                    ? `Hammasini qabul + oshxonaga (${pendingCount})`
                    : `Hammasini qabul qilish (${pendingCount})`}
              </button>
            </div>
          )}

          {displayOrders.length === 0 ? (
            <div className="dp-card rounded-2xl p-16 text-center">
              <span
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: "var(--dp-accent-soft)", color: "var(--dp-accent)" }}
              >
                <Inbox className="h-7 w-7" />
              </span>
              <p className="mt-4 font-medium text-[var(--dp-muted)]">Hozircha buyurtmalar yo&apos;q</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {displayOrders.map((order) => {
                const needsAction = orderNeedsCashierAction(order);
                const hasNew = orderHasNewItems(order.items);
                return (
                <div
                  key={order.id}
                  className={`dp-card rounded-2xl p-5 ${
                    needsAction
                      ? "ring-2 ring-[var(--dp-accent)] ring-offset-2 ring-offset-[var(--dp-bg)]"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-2xl font-bold text-[var(--dp-accent)]">
                        #{String(order.orderNumber).padStart(3, "0")}
                      </span>
                      {order.table && (
                        <span className="ml-2 text-sm text-[var(--dp-muted)]">
                          Stol {order.table.number}
                        </span>
                      )}
                      {hasNew && (
                        <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-600">
                          Yangi
                        </span>
                      )}
                      {!order.table && (
                        <span
                          className="ml-2 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: "var(--dp-accent-soft)",
                            color: "var(--dp-accent)",
                          }}
                        >
                          {ORDER_TYPE_LABELS[order.type] ?? order.type}
                        </span>
                      )}
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-xs"
                      style={{ background: "var(--dp-input-bg)", color: "var(--dp-muted)" }}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-[var(--dp-muted)]">
                    Kimdan: {orderCreatorLabel(order)}
                  </p>

                  <ul className="mt-3 space-y-1 text-sm text-[var(--dp-subtle)]">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex items-center gap-2">
                        <span>
                          {item.quantity}x {item.product.name}
                        </span>
                        {item.isNewAddition && (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-600">
                            yangi
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {(order.customerPhone || order.customerAddress) && (
                    <div
                      className="mt-2 rounded-lg border p-2 text-xs text-[var(--dp-muted)]"
                      style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
                    >
                      {order.customerName && <p>{order.customerName}</p>}
                      {order.customerPhone && <p>{order.customerPhone}</p>}
                      {order.customerAddress && <p>{order.customerAddress}</p>}
                    </div>
                  )}

                  {order.notes && (
                    <p className="mt-2 text-xs text-[var(--dp-muted)]">Izoh: {order.notes}</p>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--dp-text)]">
                      {formatPrice(order.totalAmount)}
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      {order.table &&
                        order.status !== "CANCELLED" &&
                        order.status !== "DELIVERED" && (
                          <button
                            type="button"
                            onClick={() => openTableFromOrder(order.table!.number)}
                            className="btn btn-secondary px-3 py-1.5 text-xs"
                          >
                            Stolni tahrirlash
                          </button>
                        )}
                      {order.status !== "PENDING" && order.status !== "CANCELLED" && (
                        <button
                          type="button"
                          onClick={() =>
                            printMultipleKitchenReceipts(orderToKitchenReceipts(order))
                          }
                          className="btn btn-secondary gap-1 px-2 py-1.5 text-xs"
                          title="Oshxona chekini qayta chop etish"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Oshxona cheki
                        </button>
                      )}
                      {needsAction && (
                        <button
                          onClick={() => acceptOrder(order)}
                          className="btn btn-primary gap-1 px-3 py-1.5 text-xs"
                          title={
                            getAutoPrintKitchen()
                              ? "Buyurtmani qabul qilish va oshxonaga chek yuborish"
                              : "Buyurtmani qabul qilish"
                          }
                        >
                          {getAutoPrintKitchen() && <Printer className="h-3.5 w-3.5" />}
                          {getAutoPrintKitchen()
                            ? hasNew && order.status !== "PENDING"
                              ? "Yangi taomlar → oshxona"
                              : "Qabul + oshxonaga"
                            : hasNew && order.status !== "PENDING"
                              ? "Yangi taomlarni qabul"
                              : "Qabul qilish"}
                        </button>
                      )}
                      {order.status === "READY" && order.type !== "DELIVERY" && (
                        <button
                          onClick={() => updateStatus(order.id, "DELIVERED")}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          Berildi
                        </button>
                      )}
                      {order.status === "READY" && order.type === "DELIVERY" && (
                        <span className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">
                          Yetkazuvchi yetkazadi
                        </span>
                      )}
                      {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                        <button
                          type="button"
                          onClick={() => updateStatus(order.id, "CANCELLED")}
                          className="btn btn-secondary px-3 py-1.5 text-xs text-red-600"
                        >
                          Bekor
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

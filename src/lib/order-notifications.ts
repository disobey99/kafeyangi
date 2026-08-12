import type { CafeEvent } from "@/lib/realtime";

export const ORDER_SOUND_STORAGE_KEY = "kafe-order-sound";

export function isOrderSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ORDER_SOUND_STORAGE_KEY) === "1";
}

export function enableOrderSound(): void {
  localStorage.setItem(ORDER_SOUND_STORAGE_KEY, "1");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("kafe:alerts-enabled"));
  }
}

export function disableOrderSound(): void {
  localStorage.setItem(ORDER_SOUND_STORAGE_KEY, "0");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("kafe:alerts-disabled"));
  }
}

export function setOrderSoundEnabled(on: boolean): void {
  if (on) enableOrderSound();
  else disableOrderSound();
}

export function dispatchWaiterCallAlert(cafeId: string, tableNumber: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("kafe:waiter-call", {
      detail: { cafeId, tableNumber },
    }),
  );
}

export type PendingOrdersEvent = CustomEvent<{ cafeId: string; count: number }>;

export function dispatchPendingOrders(cafeId: string, count: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("kafe:pending-orders", { detail: { cafeId, count } }),
  );
}

export type NewOrderAlertEvent = CustomEvent<{
  cafeId: string;
  orderNumber: number;
  tableNumber?: number;
}>;

export function dispatchNewOrderAlert(
  cafeId: string,
  orderNumber: number,
  tableNumber?: number,
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("kafe:new-order", {
      detail: { cafeId, orderNumber, tableNumber },
    }),
  );
}

export type RealtimeHandler = (event: CafeEvent) => void;

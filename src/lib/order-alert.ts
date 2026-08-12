import { playNewOrderAlert } from "@/lib/new-order-alert";
import { notifyNewOrderPopup } from "@/lib/staff-local-notify";

const ORDER_VIBRATE = [200, 80, 200, 80, 400, 80, 400];

export function vibrateOrderAlert() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return false;
  }
  return navigator.vibrate(ORDER_VIBRATE);
}

export function triggerOrderAlert(
  orderNumber: number,
  audioCtx?: AudioContext | null,
  withSound = true,
) {
  vibrateOrderAlert();
  void notifyNewOrderPopup(orderNumber);
  if (withSound && audioCtx) {
    playNewOrderAlert(audioCtx, { orderNumber, withVoice: true });
  }
}

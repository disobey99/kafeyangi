import { playWaiterCallAlert } from "@/lib/new-order-alert";
import { notifyWaiterCallPopup } from "@/lib/staff-local-notify";

const VIBRATE_PATTERN = [400, 120, 400, 120, 600, 120, 600];

export function vibrateWaiterCall() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return false;
  }
  return navigator.vibrate(VIBRATE_PATTERN);
}

export function stopWaiterVibration() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(0);
  }
}

export function triggerWaiterCallAlert(
  tableNumber: number,
  audioCtx?: AudioContext | null,
  withSound = true,
) {
  vibrateWaiterCall();
  void notifyWaiterCallPopup(tableNumber);
  if (withSound && audioCtx) {
    playWaiterCallAlert(audioCtx, tableNumber);
  }
}

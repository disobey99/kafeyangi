/**
 * Qalqib chiquvchi bildirishnoma:
 * - Capacitor APK → LocalNotifications (+ ovoz kanali)
 * - Brauzer / PWA → Notification API
 */

import {
  orderAlertCopy,
  waiterCallAlertCopy,
} from "@/lib/new-order-alert";
import { getStaffAlertLocale } from "@/lib/staff-alert-locale";

type CapLocalNotifications = {
  requestPermissions: () => Promise<{ display?: string }>;
  checkPermissions?: () => Promise<{ display?: string }>;
  createChannel?: (channel: {
    id: string;
    name: string;
    importance: number;
    sound?: string;
    vibration?: boolean;
    visibility?: number;
  }) => Promise<void>;
  schedule: (opts: {
    notifications: Array<{
      id: number;
      title: string;
      body: string;
      channelId?: string;
      sound?: string;
      extra?: Record<string, unknown>;
    }>;
  }) => Promise<void>;
};

function getCapacitor():
  | {
      isNativePlatform?: () => boolean;
      Plugins?: { LocalNotifications?: CapLocalNotifications };
    }
  | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window as unknown as {
      Capacitor?: {
        isNativePlatform?: () => boolean;
        Plugins?: { LocalNotifications?: CapLocalNotifications };
      };
    }
  ).Capacitor;
}

export function isNativeStaffApp() {
  const cap = getCapacitor();
  return Boolean(cap?.isNativePlatform?.());
}

let channelReady = false;
let notifyId = 1000;

async function ensureNativeChannel(plugin: CapLocalNotifications) {
  if (channelReady || !plugin.createChannel) return;
  try {
    await plugin.createChannel({
      id: "nookline_orders",
      name: "Buyurtmalar",
      importance: 5,
      vibration: true,
      visibility: 1,
    });
    channelReady = true;
  } catch {
    /* Android 8- yoki kanal allaqachon bor */
    channelReady = true;
  }
}

export async function requestStaffNotificationPermission(): Promise<boolean> {
  const cap = getCapacitor();
  const plugin = cap?.Plugins?.LocalNotifications;

  if (cap?.isNativePlatform?.() && plugin) {
    try {
      const cur = await plugin.checkPermissions?.();
      if (cur?.display === "granted") {
        await ensureNativeChannel(plugin);
        return true;
      }
      const res = await plugin.requestPermissions();
      const ok = res.display === "granted";
      if (ok) await ensureNativeChannel(plugin);
      return ok;
    } catch {
      return false;
    }
  }

  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

async function showPopup(title: string, body: string, tag: string) {
  const cap = getCapacitor();
  const plugin = cap?.Plugins?.LocalNotifications;

  if (cap?.isNativePlatform?.() && plugin) {
    try {
      await ensureNativeChannel(plugin);
      const id = ++notifyId;
      await plugin.schedule({
        notifications: [
          {
            id,
            title,
            body,
            channelId: "nookline_orders",
            extra: { tag },
          },
        ],
      });
      return;
    } catch (e) {
      console.warn("[staff-local-notify] native failed", e);
    }
  }

  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      const n = new Notification(title, {
        body,
        icon: "/icons/icon-staff.svg",
        tag,
        renotify: true,
        requireInteraction: true,
        silent: false,
      } as NotificationOptions);
      setTimeout(() => n.close(), 20000);
    } catch {
      /* ignore */
    }
  }
}

export async function notifyNewOrderPopup(orderNumber: number) {
  const locale = getStaffAlertLocale();
  const { title, body } = orderAlertCopy(orderNumber, locale);
  await showPopup(title, body, `order-${orderNumber}-${Date.now()}`);
}

export async function notifyWaiterCallPopup(tableNumber: number) {
  const locale = getStaffAlertLocale();
  const { title, body } = waiterCallAlertCopy(tableNumber, locale);
  await showPopup(title, body, `waiter-${tableNumber}-${Date.now()}`);
}

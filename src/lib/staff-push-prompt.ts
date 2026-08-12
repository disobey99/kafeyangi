const DISMISS_KEY = "kafe-push-prompt-dismissed-at";
const SNOOZE_MS = 3 * 60 * 60 * 1000; // 3 soatdan keyin qayta eslatish

export function getPushPromptDismissedAt(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function snoozePushPrompt() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

export function clearPushPromptSnooze() {
  localStorage.removeItem(DISMISS_KEY);
}

/** Hozir modal/banner ko'rsatish kerakmi */
export function shouldShowPushPrompt(opts: {
  pushSupported: boolean;
  pushEnabled: boolean;
  permission: NotificationPermission | "unsupported";
}): boolean {
  if (!opts.pushSupported) return false;
  if (opts.pushEnabled && opts.permission === "granted") return false;
  if (opts.permission === "denied") return true; // sozlamaga yo'naltirish

  const dismissedAt = getPushPromptDismissedAt();
  if (!dismissedAt) return true; // birinchi marta
  return Date.now() - dismissedAt >= SNOOZE_MS;
}

export function pushLimitationsForRole(
  role: "waiter" | "cashier" | "kitchen" | "staff" | "courier",
) {
  if (role === "cashier") {
    return [
      "Telefon qulflanganida yangi buyurtma signalini eshitmasligingiz mumkin",
      "Chrome yoki ilovadan chiqib ketganda ogohlantirish kelmasligi mumkin",
      "Mijoz kutib qolishi yoki buyurtma kechikishi mumkin",
    ];
  }
  if (role === "kitchen") {
    return [
      "Yangi oshxona cheki kelganini kech bilishingiz mumkin",
      "Ekran o'chiq yoki boshqa ilovada bo'lsangiz signal kelmasligi mumkin",
      "Tayyorlash kechikishi mumkin",
    ];
  }
  if (role === "courier") {
    return [
      "Ilovadan chiqqanda yangi yetkazish xabari kelmasligi mumkin",
      "Telefon qulflanganida vibratsiya/push ishlamasligi mumkin",
      "Buyurtmani kech ko'rib qolishingiz mumkin",
    ];
  }
  // waiter / default
  return [
    "Mijoz ofitsiant chaqirganda telefon qulflanganida bilmasligingiz mumkin",
    "Chrome yoki ilovadan chiqib ketganda chaqiriq xabari kelmasligi mumkin",
    "Stol kutib qolishi — xizmat sifati tushishi mumkin",
  ];
}

const DISMISS_KEY = "kafe-push-prompt-dismissed-at";
/** Modal bir marta yopilgan / ruxsat berilgan — qayta modal chiqmasin */
const MODAL_DONE_KEY = "kafe-push-prompt-modal-done";
const SNOOZE_MS = 3 * 60 * 60 * 1000; // 3 soatdan keyin banner eslatishi mumkin

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

export function isPushPromptModalDone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MODAL_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Keyinroq / Yoqish / brauzer ruxsati — modal qayta chiqmasin */
export function markPushPromptModalDone() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MODAL_DONE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Modal ochilsinmi (banner alohida) */
export function shouldShowPushPromptModal(opts: {
  pushEnabled: boolean;
  permission: NotificationPermission | "unsupported";
}): boolean {
  if (opts.pushEnabled && opts.permission === "granted") return false;
  if (opts.permission === "granted") return false;
  if (isPushPromptModalDone()) return false;

  // Denied — birinchi marta modal, keyin faqat banner
  if (opts.permission === "denied") {
    return !isPushPromptModalDone();
  }

  const dismissedAt = getPushPromptDismissedAt();
  if (!dismissedAt) return true;
  // Keyinroq bosilgan — modal qayta chiqmasin (banner qolishi mumkin)
  return false;
}

/** Hozir modal/banner ko'rsatish kerakmi (banner uchun snooze) */
export function shouldShowPushPrompt(opts: {
  pushSupported: boolean;
  pushEnabled: boolean;
  permission: NotificationPermission | "unsupported";
}): boolean {
  if (!opts.pushSupported) return false;
  if (opts.pushEnabled && opts.permission === "granted") return false;
  if (opts.permission === "granted") return false; // ruxsat bor — eslatma shart emas
  if (opts.permission === "denied") return true; // sozlamaga yo'naltirish (banner)

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

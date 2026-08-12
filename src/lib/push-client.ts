const SW_URL = "/sw.js";
const PUSH_ENABLED_KEY = "kafe-push-enabled";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isPushEnabledLocally() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PUSH_ENABLED_KEY) === "1";
}

export function markPushEnabledLocally() {
  localStorage.setItem(PUSH_ENABLED_KEY, "1");
}

export async function ensureServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.register(SW_URL);
  await navigator.serviceWorker.ready;
  return reg;
}

export type SubscribePushResult = { ok: true } | { ok: false; error: string };

export async function subscribeCafePushDetailed(
  cafeId: string,
): Promise<SubscribePushResult> {
  if (!isPushSupported()) {
    return {
      ok: false,
      error:
        "Bu brauzer push bildirishnomani qo‘llab-quvvatlamaydi. Chrome/Safari (PWA) da oching.",
    };
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) {
    return {
      ok: false,
      error:
        "Serverda VAPID kaliti yo‘q. Vercel Environment: NEXT_PUBLIC_VAPID_PUBLIC_KEY qo‘ying va qayta deploy qiling.",
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      error:
        "Bildirishnoma ruxsati berilmadi. Brauzer sozlamalaridan ruxsat bering.",
    };
  }

  let reg;
  try {
    reg = await ensureServiceWorker();
  } catch {
    return { ok: false, error: "Service Worker o‘rnatilmadi. HTTPS da oching." };
  }
  if (!reg) {
    return { ok: false, error: "Service Worker topilmadi." };
  }

  let sub;
  try {
    sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
  } catch {
    return {
      ok: false,
      error:
        "Push subscribe muvaffaqiyatsiz. Kalit noto‘g‘ri bo‘lishi yoki brauzer bloklagan bo‘lishi mumkin.",
    };
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: "Push kalitlari olinmadi." };
  }

  const res = await fetch(`/api/cafes/${cafeId}/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Sessiya tugagan — qayta kiring." };
    }
    return { ok: false, error: "Serverga yozib bo‘lmadi. Keyinroq urinib ko‘ring." };
  }

  markPushEnabledLocally();
  return { ok: true };
}

/** @deprecated prefer subscribeCafePushDetailed */
export async function subscribeCafePush(cafeId: string): Promise<boolean> {
  const result = await subscribeCafePushDetailed(cafeId);
  return result.ok;
}

export async function syncExistingPushSubscription(cafeId: string) {
  if (!isPushSupported() || !isPushEnabledLocally()) return false;
  if (Notification.permission !== "granted") return false;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return false;

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const res = await fetch(`/api/cafes/${cafeId}/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  });

  return res.ok;
}

"use client";

import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  createNativeBioSecret,
  getNativeBiometricPlugin,
  isCapacitorNativeApp,
  isNativeBiometricHardwareAvailable,
  nativeBioServerKey,
} from "@/lib/staff-native-biometric";

function clientHostQuery() {
  if (typeof window === "undefined") return "";
  return `clientHost=${encodeURIComponent(window.location.hostname)}`;
}

/** Sozlamalar UI — har doim ko‘rsatish mumkin (haqiqiy qo‘llab-quvvatlash alohida) */
export async function isStaffBiometricAvailable(): Promise<boolean> {
  if (isCapacitorNativeApp()) {
    const native = await isNativeBiometricHardwareAvailable();
    if (native) return true;
    // Plugin yo‘q / eski APK — WebAuthn urinish uchun true (tugma ko‘rinsin)
    return true;
  }
  try {
    if (!browserSupportsWebAuthn()) return true; // UI ko‘rinsin, xato matni chiqadi
    return await platformAuthenticatorIsAvailable();
  } catch {
    return true;
  }
}

/** Qurilmada biometriya chaqirish mumkinmi (auto-prompt uchun) */
export async function canInvokeStaffBiometric(): Promise<boolean> {
  if (isCapacitorNativeApp()) {
    return isNativeBiometricHardwareAvailable();
  }
  try {
    return browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable());
  } catch {
    return false;
  }
}

async function registerNative(cafeId: string): Promise<void> {
  const plugin = getNativeBiometricPlugin();
  if (!plugin) {
    throw new Error(
      "APK yangilang: Native Biometric plugin yo‘q. Yoki brauzerda Chrome orqali yoqing.",
    );
  }

  const avail = await plugin.isAvailable({ useFallback: false });
  if (!avail.isAvailable) {
    throw new Error(
      "Qurilmada barmoq izi / Face ID yo‘q yoki sozlanmagan. Telefon sozlamalaridan biometriyani yoqing.",
    );
  }

  await plugin.verifyIdentity({
    reason: "Barmoq izi / Face ID ni Nookline uchun yoqish",
    title: "Biometriya",
    subtitle: "Xavfsizlik",
    description: "Parol o‘rniga ochish uchun tasdiqlang",
    negativeButtonText: "Bekor",
    maxAttempts: 5,
  });

  const me = await fetch("/api/auth/me").then((r) => r.json());
  const userId = me?.user?.id as string | undefined;
  if (!userId) throw new Error("Sessiya topilmadi — qayta kiring");

  const secret = createNativeBioSecret();
  const server = nativeBioServerKey(cafeId, userId);
  await plugin.setCredentials({
    username: userId,
    password: secret,
    server,
  });

  const res = await fetch(`/api/cafes/${cafeId}/staff/pin/webauthn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "native-register", secret }),
  });
  const data = await res.json();
  if (!res.ok) {
    try {
      await plugin.deleteCredentials({ server });
    } catch {
      /* ignore */
    }
    throw new Error(data.error || "Barmoq izi saqlanmadi");
  }
}

async function authenticateNative(cafeId: string): Promise<void> {
  const plugin = getNativeBiometricPlugin();
  if (!plugin) {
    throw new Error("APK biometriya pluginini qo‘llab-quvvatlamaydi — yangilang.");
  }

  const me = await fetch("/api/auth/me").then((r) => r.json());
  const userId = me?.user?.id as string | undefined;
  if (!userId) throw new Error("Sessiya topilmadi — qayta kiring");

  const server = nativeBioServerKey(cafeId, userId);

  await plugin.verifyIdentity({
    reason: "Ekranni ochish",
    title: "Biometriya",
    subtitle: "Nookline Xodim",
    description: "Barmoq izi yoki Face ID bilan tasdiqlang",
    negativeButtonText: "Bekor",
    maxAttempts: 5,
  });

  const creds = await plugin.getCredentials({ server });
  if (!creds?.password) {
    throw new Error("Barmoq izi ulanmagan. Sozlamalardan qayta yoqing.");
  }

  const res = await fetch(`/api/cafes/${cafeId}/staff/pin/webauthn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "native-authenticate",
      secret: creds.password,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Barmoq izi tasdiqlanmadi");
}

async function disableNative(cafeId: string): Promise<void> {
  const plugin = getNativeBiometricPlugin();
  try {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    const userId = me?.user?.id as string | undefined;
    if (plugin && userId) {
      await plugin.deleteCredentials({
        server: nativeBioServerKey(cafeId, userId),
      });
    }
  } catch {
    /* ignore local wipe */
  }
}

export async function registerStaffBiometric(cafeId: string): Promise<void> {
  if (isCapacitorNativeApp() && getNativeBiometricPlugin()) {
    await registerNative(cafeId);
    return;
  }

  const optRes = await fetch(
    `/api/cafes/${cafeId}/staff/pin/webauthn?phase=register-options&${clientHostQuery()}`,
  );
  const optData = await optRes.json();
  if (!optRes.ok) throw new Error(optData.error || "Barmoq izini yoqib bo'lmadi");

  const attestation = await startRegistration({ optionsJSON: optData });
  const res = await fetch(
    `/api/cafes/${cafeId}/staff/pin/webauthn?${clientHostQuery()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", response: attestation }),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Barmoq izi saqlanmadi");
}

export async function authenticateStaffBiometric(cafeId: string): Promise<void> {
  if (isCapacitorNativeApp() && getNativeBiometricPlugin()) {
    try {
      await authenticateNative(cafeId);
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      // Native credential yo‘q bo‘lsa WebAuthn (eski ulanish)
      if (
        !msg.includes("ulanmagan") &&
        !msg.includes("Credentials") &&
        !/not found|no credentials/i.test(msg)
      ) {
        throw e;
      }
    }
  }

  const optRes = await fetch(
    `/api/cafes/${cafeId}/staff/pin/webauthn?phase=authenticate-options&${clientHostQuery()}`,
  );
  const optData = await optRes.json();
  if (!optRes.ok) throw new Error(optData.error || "Barmoq izi ochilmadi");

  const assertion = await startAuthentication({ optionsJSON: optData });
  const res = await fetch(
    `/api/cafes/${cafeId}/staff/pin/webauthn?${clientHostQuery()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "authenticate", response: assertion }),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Barmoq izi tasdiqlanmadi");
}

export async function disableStaffBiometric(cafeId: string): Promise<void> {
  if (isCapacitorNativeApp()) {
    await disableNative(cafeId);
  }
  const res = await fetch(`/api/cafes/${cafeId}/staff/pin/webauthn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "disable" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "O'chirib bo'lmadi");
}

export function biometricUserMessage(e: unknown): string {
  const name = e instanceof Error ? e.name : "";
  const msg = e instanceof Error ? e.message : "";

  if (name === "NotAllowedError") {
    return "Barmoq izi ochilmadi. Bekor qilinmagan bo'lsa: ekran qulfi yoqilganini tekshiring va qayta bosing.";
  }
  if (name === "InvalidStateError") {
    return "Bu telefonda barmoq izi allaqachon bog'langan. Avval o'chirib, qayta yoqing.";
  }
  if (name === "NotSupportedError") {
    return "Bu muhit barmoq izini qo'llab-quvvatlamaydi. APK yoki Chrome dan oching.";
  }
  if (name === "SecurityError") {
    return "Xavfsizlik xatosi — HTTPS kerak yoki APK orqali oching.";
  }
  if (msg) return msg;
  return "Barmoq izi ishlamadi. APKda yangilang yoki HTTPS orqali qayta urinib ko'ring.";
}

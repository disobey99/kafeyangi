"use client";

import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

function clientHostQuery() {
  if (typeof window === "undefined") return "";
  return `clientHost=${encodeURIComponent(window.location.hostname)}`;
}

export async function isStaffBiometricAvailable(): Promise<boolean> {
  try {
    return browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable());
  } catch {
    return false;
  }
}

export async function registerStaffBiometric(cafeId: string): Promise<void> {
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
    return "Bu brauzer barmoq izini qo'llab-quvvatlamaydi. Chrome dan oching.";
  }
  if (name === "SecurityError") {
    return "Xavfsizlik xatosi — faqat HTTPS orqali ishlaydi (tunnel havolasi).";
  }
  if (msg) return msg;
  return "Barmoq izi ishlamadi. HTTPS tunnel orqali oching va qayta urinib ko'ring.";
}

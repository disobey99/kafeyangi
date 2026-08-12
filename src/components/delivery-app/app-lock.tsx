"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Lock } from "lucide-react";

import { getDeliveryUiLabels } from "@/lib/delivery-ui-labels";
import type { MenuLocale } from "@/lib/menu-i18n";

const pinKey = (slug: string) => `delivery-app-lock-pin:${slug}`;
const bioKey = (slug: string) => `delivery-app-lock-bio:${slug}`;
const unlockedKey = (slug: string) => `delivery-app-lock-ok:${slug}`;

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): ArrayBuffer {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`da-lock:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toBase64Url(digest);
}

export function hasAppLock(slug: string): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(pinKey(slug)));
}

export function isAppUnlocked(slug: string): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(unlockedKey(slug)) === "1";
}

export function setAppUnlocked(slug: string, ok: boolean) {
  if (ok) sessionStorage.setItem(unlockedKey(slug), "1");
  else sessionStorage.removeItem(unlockedKey(slug));
}

export async function isPlatformBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function DeliveryAppLockScreen({
  slug,
  cafeName,
  primaryColor,
  mode,
  locale,
  onUnlocked,
}: {
  slug: string;
  cafeName: string;
  primaryColor: string;
  mode: "unlock" | "setup";
  locale: MenuLocale;
  onUnlocked: () => void;
}) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [bioOk, setBioOk] = useState(false);
  const [hasBio, setHasBio] = useState(false);
  const [busy, setBusy] = useState(false);
  const [offerBioAfterSetup, setOfferBioAfterSetup] = useState(false);
  const ui = getDeliveryUiLabels(locale);

  useEffect(() => {
    void isPlatformBiometricAvailable().then(setBioOk);
    setHasBio(Boolean(localStorage.getItem(bioKey(slug))));
  }, [slug]);

  // Qayta ochilganda barmoq izi avtomatik so‘ralsin
  useEffect(() => {
    if (mode !== "unlock" || !bioOk || !hasBio) return;
    const t = window.setTimeout(() => {
      void unlockWithBio();
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat birinchi unlock
  }, [mode, bioOk, hasBio]);

  async function setup() {
    if (pin.length < 4) {
      setError(ui.pinLengthError);
      return;
    }
    if (pin !== confirm) {
      setError(ui.pinMismatchError);
      return;
    }
    localStorage.setItem(pinKey(slug), await hashPin(pin));
    if (bioOk && !localStorage.getItem(bioKey(slug))) {
      setOfferBioAfterSetup(true);
      setError("");
      return;
    }
    setAppUnlocked(slug, true);
    onUnlocked();
  }

  async function unlockWithPin() {
    const stored = localStorage.getItem(pinKey(slug));
    if (!stored) {
      onUnlocked();
      return;
    }
    if ((await hashPin(pin)) !== stored) {
      setError(ui.incorrectPin);
      return;
    }
    setAppUnlocked(slug, true);
    onUnlocked();
  }

  async function registerBio() {
    setBusy(true);
    setError("");
    try {
      const userId = new TextEncoder().encode(`app-lock:${slug}`);
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: cafeName, id: window.location.hostname },
          user: {
            id: userId,
            name: `lock-${slug}`,
            displayName: cafeName,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60_000,
        },
      })) as PublicKeyCredential | null;
      if (!cred) throw new Error("Bekor qilindi");
      localStorage.setItem(bioKey(slug), toBase64Url(cred.rawId));
      setHasBio(true);
      setError("");
      if (offerBioAfterSetup || mode === "setup") {
        setOfferBioAfterSetup(false);
        setAppUnlocked(slug, true);
        onUnlocked();
        return;
      }
      alert(ui.bioConnectedAlert);
    } catch (e) {
      setError(e instanceof Error ? e.message : ui.bioError);
    } finally {
      setBusy(false);
    }
  }

  async function unlockWithBio() {
    const id = localStorage.getItem(bioKey(slug));
    if (!id) {
      setError(ui.connectBioFirst);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const cred = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [
            { id: fromBase64Url(id), type: "public-key", transports: ["internal"] },
          ],
          userVerification: "required",
          timeout: 60_000,
        },
      });
      if (!cred) throw new Error("Bekor qilindi");
      setAppUnlocked(slug, true);
      onUnlocked();
    } catch (e) {
      setError(e instanceof Error ? e.message : ui.bioUnlockError);
    } finally {
      setBusy(false);
    }
  }

  if (offerBioAfterSetup) {
    return (
      <div className="fixed inset-0 z-[90] flex items-end justify-center bg-stone-900/50 sm:items-center">
        <div className="w-full max-w-md rounded-t-3xl bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 sm:rounded-3xl">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white"
            style={{ background: primaryColor }}
          >
            <Fingerprint className="h-7 w-7" />
          </div>
          <h2 className="text-center text-xl font-extrabold text-stone-900">
            {ui.bioConnectBtn}
          </h2>
          <p className="mt-1 text-center text-sm text-stone-500">
            {locale === "ru"
              ? "В следующий раз можно открыть отпечатком"
              : locale === "en"
                ? "Next time unlock with fingerprint"
                : "Keyingi safar barmoq izi bilan ochiladi"}
          </p>
          {error ? <p className="mt-2 text-center text-sm text-red-500">{error}</p> : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void registerBio()}
            className="mt-5 w-full rounded-2xl py-3.5 text-sm font-extrabold text-white disabled:opacity-60"
            style={{ background: primaryColor }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Fingerprint className="h-4 w-4" />
              {ui.bioConnectBtn}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOfferBioAfterSetup(false);
              setAppUnlocked(slug, true);
              onUnlocked();
            }}
            className="mt-2 w-full rounded-2xl py-3 text-sm font-bold text-stone-500"
          >
            {locale === "ru" ? "Позже" : locale === "en" ? "Later" : "Keyinroq"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-stone-900/50 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 sm:rounded-3xl">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white"
          style={{ background: primaryColor }}
        >
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-center text-xl font-extrabold text-stone-900">
          {mode === "setup" ? ui.appLockTitle : ui.unlockTitle}
        </h2>
        <p className="mt-1 text-center text-sm text-stone-500">
          {mode === "setup"
            ? ui.setupSubtitle
            : cafeName}
        </p>

        <input
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder={ui.pinPlaceholder}
          className="mt-5 w-full rounded-2xl bg-[#F5F5F5] px-4 py-3 text-center text-lg font-bold tracking-[0.3em] outline-none"
        />
        {mode === "setup" ? (
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
            placeholder={ui.confirmPinPlaceholder}
            className="mt-2 w-full rounded-2xl bg-[#F5F5F5] px-4 py-3 text-center text-lg font-bold tracking-[0.3em] outline-none"
          />
        ) : null}

        {error ? <p className="mt-2 text-center text-sm text-red-500">{error}</p> : null}

        <button
          type="button"
          onClick={() => void (mode === "setup" ? setup() : unlockWithPin())}
          className="mt-4 w-full rounded-2xl py-3.5 text-sm font-extrabold text-white"
          style={{ background: primaryColor }}
        >
          {mode === "setup" ? ui.saveBtn : ui.unlockBtn}
        </button>

        {bioOk && mode === "unlock" && hasBio ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void unlockWithBio()}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 py-3 text-sm font-extrabold text-white disabled:opacity-60"
          >
            <Fingerprint className="h-4 w-4" />
            {ui.bioBtn}
          </button>
        ) : null}

        {bioOk && mode === "setup" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void registerBio()}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 py-3 text-sm font-bold text-stone-700 disabled:opacity-60"
          >
            <Fingerprint className="h-4 w-4" />
            {ui.bioConnectBtn}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function clearAppLock(slug: string) {
  localStorage.removeItem(pinKey(slug));
  localStorage.removeItem(bioKey(slug));
  setAppUnlocked(slug, false);
}

export function hasAppBiometric(slug: string): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(bioKey(slug)));
}

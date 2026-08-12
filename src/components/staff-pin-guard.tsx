"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Fingerprint, Lock, ShieldCheck } from "lucide-react";
import { subscribeCafeEvents } from "@/lib/cafe-realtime-client";
import { useStaffPinIdleLock } from "@/lib/staff-pin-client";
import {
  authenticateStaffBiometric,
  biometricUserMessage,
  isStaffBiometricAvailable,
  registerStaffBiometric,
} from "@/lib/staff-webauthn-client";

type PinStatus = {
  hasPin: boolean;
  needsSetup: boolean;
  unlocked: boolean;
  resetRequired: boolean;
  hasBiometric?: boolean;
};

export function StaffPinGuard({
  cafeId,
  children,
}: {
  cafeId: string;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<PinStatus | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [offerBio, setOfferBio] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const autoBioTriedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafeId}/staff/pin`);
      if (!res.ok) {
        if (res.status === 401) {
          window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setError("Parol holati yuklanmadi — sahifani yangilang");
        setStatus({ hasPin: false, needsSetup: false, unlocked: false, resetRequired: false });
        return;
      }
      setError("");
      setStatus((await res.json()) as PinStatus);
    } catch {
      setError("Tarmoq xatosi — internetni tekshiring");
      setStatus({ hasPin: false, needsSetup: false, unlocked: false, resetRequired: false });
    }
  }, [cafeId]);

  useEffect(() => {
    refresh();

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        userIdRef.current = d.user?.id ?? null;
      })
      .catch(() => {});

    void isStaffBiometricAvailable().then(setBioSupported);

    function onPinReset() {
      setPin("");
      setConfirmPin("");
      setError("");
      setOfferBio(false);
      autoBioTriedRef.current = false;
      refresh();
    }

    function onLocked() {
      setPin("");
      setConfirmPin("");
      setOfferBio(false);
      autoBioTriedRef.current = false;
      refresh();
    }

    function onVisible() {
      if (document.visibilityState === "visible") refresh();
    }

    window.addEventListener("kafe:staff-pin-locked", onLocked);
    window.addEventListener("kafe:staff-pin-reset", onPinReset);
    document.addEventListener("visibilitychange", onVisible);

    const unsub = subscribeCafeEvents(cafeId, (event) => {
      if (event.type !== "staff.pin.reset") return;
      const payload = event.payload as { userId?: string } | undefined;
      if (payload?.userId && userIdRef.current && payload.userId !== userIdRef.current) {
        return;
      }
      onPinReset();
      window.dispatchEvent(new CustomEvent("kafe:staff-pin-reset"));
    });

    return () => {
      window.removeEventListener("kafe:staff-pin-locked", onLocked);
      window.removeEventListener("kafe:staff-pin-reset", onPinReset);
      document.removeEventListener("visibilitychange", onVisible);
      unsub();
    };
  }, [cafeId, refresh]);

  const mode = status?.needsSetup ? "setup" : "unlock";
  const blocked = status ? status.needsSetup || !status.unlocked : false;
  const setupConfirmPhase = mode === "setup" && pin.length === 6;

  const submitSetup = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/staff/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup", pin, confirmPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik");
        setConfirmPin("");
        return;
      }
      setPin("");
      setConfirmPin("");
      await refresh();
      window.dispatchEvent(new CustomEvent("kafe:staff-pin-unlocked"));
      if (bioSupported) setOfferBio(true);
    } finally {
      setLoading(false);
    }
  }, [cafeId, pin, confirmPin, refresh, bioSupported]);

  const submitUnlock = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/staff/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPin("");
        setConfirmPin("");
        await refresh();
        setError(
          data.error?.includes("yangi parol")
            ? "Admin parolni tikladi — yangi parol o'rnating"
            : data.error || "Parol noto'g'ri",
        );
        return;
      }
      setPin("");
      await refresh();
      window.dispatchEvent(new CustomEvent("kafe:staff-pin-unlocked"));
      if (bioSupported && !status?.hasBiometric) setOfferBio(true);
    } finally {
      setLoading(false);
    }
  }, [cafeId, pin, refresh, bioSupported, status?.hasBiometric]);

  const unlockWithBiometric = useCallback(async () => {
    if (bioBusy || loading) return;
    setError("");
    setBioBusy(true);
    try {
      await authenticateStaffBiometric(cafeId);
      await refresh();
      window.dispatchEvent(new CustomEvent("kafe:staff-pin-unlocked"));
    } catch (e) {
      setError(biometricUserMessage(e));
    } finally {
      setBioBusy(false);
    }
  }, [bioBusy, loading, cafeId, refresh]);

  const enableBiometric = useCallback(async () => {
    if (bioBusy || loading) return;
    setError("");
    setBioBusy(true);
    try {
      await registerStaffBiometric(cafeId);
      setOfferBio(false);
      await refresh();
    } catch (e) {
      setError(biometricUserMessage(e));
    } finally {
      setBioBusy(false);
    }
  }, [bioBusy, loading, cafeId, refresh]);

  useEffect(() => {
    if (!blocked || loading) return;
    if (mode === "setup" && setupConfirmPhase && confirmPin.length === 6) submitSetup();
    else if (mode === "unlock" && pin.length === 6) submitUnlock();
  }, [blocked, loading, mode, setupConfirmPhase, pin, confirmPin, submitSetup, submitUnlock]);

  useEffect(() => {
    if (!blocked || mode !== "unlock" || !status?.hasBiometric || !bioSupported) return;
    if (autoBioTriedRef.current || loading || bioBusy) return;
    autoBioTriedRef.current = true;
    void unlockWithBiometric();
  }, [
    blocked,
    mode,
    status?.hasBiometric,
    bioSupported,
    loading,
    bioBusy,
    unlockWithBiometric,
  ]);

  const idleLockEnabled = Boolean(status?.hasPin && status?.unlocked && !status?.needsSetup);
  useStaffPinIdleLock(cafeId, idleLockEnabled);

  if (!status) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-[var(--dp-muted)]">Yuklanmoqda...</p>
      </div>
    );
  }

  if (error && !status.needsSetup && !status.unlocked && !status.hasPin) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button
          type="button"
          onClick={() => {
            setStatus(null);
            setError("");
            refresh();
          }}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--dp-accent)" }}
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  if (!blocked) {
    return (
      <>
        {children}
        {offerBio && bioSupported && !status.hasBiometric && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-4 sm:items-center">
            <div className="dp-card w-full max-w-sm rounded-3xl p-5 shadow-2xl">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: "var(--dp-accent-soft)" }}
                >
                  <Fingerprint className="h-6 w-6 text-[var(--dp-accent)]" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[var(--dp-text)]">
                    Barmoq izi bilan ochish?
                  </h3>
                  <p className="text-xs text-[var(--dp-muted)]">
                    Keyingi safar PIN o&apos;rniga telefon biometriyasi
                  </p>
                </div>
              </div>
              {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={bioBusy}
                  onClick={() => setOfferBio(false)}
                  className="flex-1 rounded-xl py-3 text-sm font-semibold"
                  style={{ background: "var(--dp-input-bg)", color: "var(--dp-text)" }}
                >
                  Keyinroq
                </button>
                <button
                  type="button"
                  disabled={bioBusy}
                  onClick={() => void enableBiometric()}
                  className="flex-1 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: "var(--dp-accent)" }}
                >
                  {bioBusy ? "Kuting..." : "Yoqish"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  const digits =
    mode === "setup" ? (setupConfirmPhase ? confirmPin : pin) : pin;
  const stepLabel =
    mode === "setup"
      ? setupConfirmPhase
        ? "Parolni qayta kiriting (tasdiqlash)"
        : "6 xonali xavfsizlik parolini o'rnating"
      : "Davom etish uchun parolni kiriting";
  const setupStep = mode === "setup" ? (setupConfirmPhase ? 2 : 1) : null;

  function pressDigit(d: string) {
    if (loading) return;
    setError("");
    if (mode === "setup") {
      if (setupConfirmPhase) {
        if (confirmPin.length < 6) setConfirmPin((p) => p + d);
      } else if (pin.length < 6) {
        setPin((p) => p + d);
      }
    } else if (pin.length < 6) {
      setPin((p) => p + d);
    }
  }

  function backspace() {
    if (loading) return;
    setError("");
    if (mode === "setup") {
      if (setupConfirmPhase && confirmPin.length > 0) {
        setConfirmPin((p) => p.slice(0, -1));
      } else if (setupConfirmPhase && confirmPin.length === 0) {
        setPin((p) => p.slice(0, -1));
      } else {
        setPin((p) => p.slice(0, -1));
      }
    } else {
      setPin((p) => p.slice(0, -1));
    }
  }

  function handlePrimaryAction() {
    if (loading) return;
    if (mode === "unlock" && pin.length === 6) {
      submitUnlock();
    } else if (mode === "setup" && setupConfirmPhase && confirmPin.length === 6) {
      submitSetup();
    }
  }

  const canSubmit =
    (mode === "unlock" && pin.length === 6) ||
    (mode === "setup" && setupConfirmPhase && confirmPin.length === 6);

  const showBioUnlock =
    mode === "unlock" && bioSupported && Boolean(status.hasBiometric);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--dp-bg)]/95 p-4 backdrop-blur-sm">
      <div className="dp-card w-full max-w-sm rounded-3xl p-6 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "var(--dp-accent-soft)" }}
          >
            {mode === "setup" ? (
              <ShieldCheck className="h-7 w-7 text-[var(--dp-accent)]" />
            ) : showBioUnlock ? (
              <Fingerprint className="h-7 w-7 text-[var(--dp-accent)]" />
            ) : (
              <Lock className="h-7 w-7 text-[var(--dp-accent)]" />
            )}
          </span>
          <h2 className="text-lg font-bold text-[var(--dp-text)]">
            {mode === "setup" ? "Xavfsizlik paroli" : "Ekran qulflangan"}
          </h2>
          <p className="mt-1 text-sm text-[var(--dp-muted)]">{stepLabel}</p>
          {setupStep && (
            <p className="mt-2 text-xs font-medium text-[var(--dp-accent)]">
              {setupStep}/2 — {setupStep === 1 ? "Yangi parol" : "Tasdiqlash"}
            </p>
          )}
          {setupConfirmPhase && confirmPin.length === 0 && (
            <p className="mt-2 rounded-lg bg-[var(--dp-accent-soft)] px-3 py-1.5 text-xs text-[var(--dp-text)]">
              Birinchi parol qabul qilindi. Endi xuddi shu parolni yana kiriting.
            </p>
          )}
          {status.resetRequired && (
            <p className="mt-2 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
              Admin parolni tikladi — yangi parol o&apos;rnating
            </p>
          )}
        </div>

        {showBioUnlock && (
          <button
            type="button"
            disabled={bioBusy || loading}
            onClick={() => void unlockWithBiometric()}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--dp-accent)" }}
          >
            <Fingerprint className="h-5 w-5" />
            {bioBusy ? "Tekshirilmoqda..." : "Barmoq izi / Face ID"}
          </button>
        )}

        {showBioUnlock && (
          <p className="mb-4 text-center text-[11px] text-[var(--dp-muted)]">
            yoki PIN kiriting
          </p>
        )}

        <PinDots value={digits} />

        {error && (
          <p className="mb-3 text-center text-sm text-red-500">{error}</p>
        )}

        <PinPad onDigit={pressDigit} onBackspace={backspace} disabled={loading || bioBusy} />

        {canSubmit && (
          <button
            type="button"
            disabled={loading}
            onClick={handlePrimaryAction}
            className="mt-4 w-full rounded-xl py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--dp-accent)" }}
          >
            {mode === "setup" ? "Parolni saqlash" : "Kirish"}
          </button>
        )}

        {loading && (
          <p className="mt-3 text-center text-xs text-[var(--dp-muted)]">Tekshirilmoqda...</p>
        )}
      </div>
    </div>
  );
}

export { lockStaffScreen } from "@/lib/staff-pin-client";

function PinDots({ value }: { value: string }) {
  return (
    <div className="mb-6 flex items-center justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className="mx-1.5 h-3.5 w-3.5 rounded-full border-2 transition-all"
          style={{
            borderColor: i < value.length ? "var(--dp-accent)" : "var(--dp-border)",
            background: i < value.length ? "var(--dp-accent)" : "transparent",
          }}
        />
      ))}
    </div>
  );
}

function PinPad({
  onDigit,
  onBackspace,
  disabled,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", columnGap: "0.5rem", rowGap: "0.5rem" }}
    >
      {keys.map((key, idx) => {
        if (key === "") return <div key={idx} />;
        return (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => (key === "del" ? onBackspace() : onDigit(key))}
            className="flex h-14 items-center justify-center rounded-xl text-xl font-semibold transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--dp-input-bg)", color: "var(--dp-text)" }}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}

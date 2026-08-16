"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import {
  biometricUserMessage,
  canInvokeStaffBiometric,
  disableStaffBiometric,
  registerStaffBiometric,
} from "@/lib/staff-webauthn-client";
import { isCapacitorNativeApp } from "@/lib/staff-native-biometric";

export function StaffBiometricSettings({ cafeId }: { cafeId: string }) {
  const [canInvoke, setCanInvoke] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafeId}/staff/pin`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        hasBiometric?: boolean;
        hasPin?: boolean;
        unlocked?: boolean;
      };
      setHasBiometric(Boolean(data.hasBiometric));
      setHasPin(Boolean(data.hasPin));
    } catch {
      /* ignore */
    }
  }, [cafeId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await canInvokeStaffBiometric();
      if (cancelled) return;
      setCanInvoke(ok);
      await refresh();
      if (cancelled) return;
      if (isCapacitorNativeApp()) {
        setHint("APK: tugma bosilganda telefon biometriya oynasi ochiladi");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function toggle() {
    setError("");
    setBusy(true);
    try {
      if (hasBiometric) {
        await disableStaffBiometric(cafeId);
        setHasBiometric(false);
      } else {
        if (!hasPin) {
          setError("Avval ekran PIN parolini o‘rnating");
          return;
        }
        await registerStaffBiometric(cafeId);
        setHasBiometric(true);
      }
    } catch (e) {
      setError(biometricUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="space-y-2 rounded-xl border px-4 py-3"
      style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--dp-text)]">
            <Fingerprint className="h-4 w-4 shrink-0 text-[var(--dp-accent)]" />
            Barmoq izi / Face ID
          </p>
          <p className="text-xs text-[var(--dp-muted)]">
            Qulflanganda PIN o&apos;rniga biometriya
            {!canInvoke && !hasBiometric
              ? " — qurilmada biometriya yo‘q yoki sozlanmagan bo‘lishi mumkin"
              : ""}
          </p>
          {hint ? (
            <p className="mt-1 text-[11px] text-[var(--dp-muted)]">{hint}</p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggle()}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
            hasBiometric ? "text-white" : "text-[var(--dp-text)]"
          }`}
          style={{
            background: hasBiometric ? "var(--dp-accent)" : "var(--dp-bg)",
            border: hasBiometric ? "none" : "1px solid var(--dp-border)",
          }}
        >
          {busy ? "..." : hasBiometric ? "Yoqilgan" : "Yoqish"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

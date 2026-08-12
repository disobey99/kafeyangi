"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import {
  biometricUserMessage,
  disableStaffBiometric,
  isStaffBiometricAvailable,
  registerStaffBiometric,
} from "@/lib/staff-webauthn-client";

export function StaffBiometricSettings({ cafeId }: { cafeId: string }) {
  const [supported, setSupported] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafeId}/staff/pin`);
      if (!res.ok) return;
      const data = (await res.json()) as { hasBiometric?: boolean };
      setHasBiometric(Boolean(data.hasBiometric));
    } catch {
      /* ignore */
    }
  }, [cafeId]);

  useEffect(() => {
    void isStaffBiometricAvailable().then(setSupported);
    void refresh();
  }, [refresh]);

  if (!supported) return null;

  async function toggle() {
    setError("");
    setBusy(true);
    try {
      if (hasBiometric) {
        await disableStaffBiometric(cafeId);
        setHasBiometric(false);
      } else {
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
          </p>
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

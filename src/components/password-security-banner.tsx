"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, X } from "lucide-react";
import {
  isPasswordAdviceDismissed,
  passwordAdviceDismissStorageKey,
} from "@/lib/password-security";

type Advice = {
  show: boolean;
  message: string;
};

export function PasswordSecurityBanner({ cafeId }: { cafeId: string }) {
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dismissed = localStorage.getItem(passwordAdviceDismissStorageKey());
        if (isPasswordAdviceDismissed(dismissed)) return;
        const res = await fetch("/api/auth/password-security", {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as Advice;
        if (cancelled || !data.show) return;
        setAdvice(data);
        setVisible(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible || !advice) return null;

  function dismiss() {
    try {
      localStorage.setItem(
        passwordAdviceDismissStorageKey(),
        new Date().toISOString(),
      );
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-3 sm:bottom-6">
      <div className="pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-2xl border border-amber-500/30 bg-[var(--dp-card,#111)]/95 p-4 shadow-xl backdrop-blur">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--dp-text,#fff)]">
            Parolni yangilash tavsiya etiladi
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--dp-muted,#aaa)]">
            {advice.message}
          </p>
          <Link
            href={`/dashboard/${cafeId}/settings#account-password`}
            className="mt-2 inline-block text-xs font-semibold text-amber-500 hover:underline"
            onClick={dismiss}
          >
            Sozlamalarga o‘tish
          </Link>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1 text-[var(--dp-muted)] hover:bg-white/5"
          aria-label="Yopish"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/**
 * Mijoz / kuryer — APK yuklab olish banneri (PWA o‘rniga).
 */
export function CustomerInstallHint({
  cafeName,
  storageKey,
  accentColor = "#0d9488",
  mode = "customer",
}: {
  cafeName: string;
  storageKey: string;
  accentColor?: string;
  mode?: "customer" | "courier";
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Capacitor APK ichida banner kerak emas
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor;
    if (cap?.isNativePlatform?.()) return;

    try {
      if (localStorage.getItem(storageKey) === "1") return;
    } catch {
      /* ignore */
    }

    const t = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(t);
  }, [storageKey]);

  if (!visible) return null;

  const apkUrl =
    process.env.NEXT_PUBLIC_CUSTOMER_APK_URL || "/downloads/nookline-mijoz.apk";
  const title =
    mode === "courier"
      ? `${cafeName} — Kuryer ilovasi`
      : `${cafeName} — Ilovani yuklab oling`;

  function dismiss() {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-[80] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label={title}
    >
      <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: accentColor }}
          >
            <Download className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-stone-900">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              Android ilovani yuklab oling — bildirishnomalar va tez ochilish uchun.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={apkUrl}
                onClick={dismiss}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white"
                style={{ background: accentColor }}
              >
                <Download className="h-3.5 w-3.5" />
                APK yuklab olish
              </a>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-stone-500 hover:bg-stone-100"
              >
                Keyinroq
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

/** Xodimlar uchun PWA o'rnatish maslahati (APK bo'lmasa ham telefon ekraniga qo'shish) */
export function StaffInstallHint() {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<{ prompt: () => Promise<void> } | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Faqat xodim manifesti (mijoz /c/.../app o‘z manifestida)
    const manifest = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (manifest) manifest.href = "/staff.webmanifest";

    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem("staff-install-dismissed") === "1") return;

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    function onBip(e: Event) {
      e.preventDefault();
      const ev = e as Event & { prompt: () => Promise<void> };
      setDeferred({ prompt: () => ev.prompt() });
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBip);
    // iOS / ba'zi brauzerlar — qo'lda ko'rsatma
    const t = window.setTimeout(() => setVisible(true), 1200);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.clearTimeout(t);
    };
  }, []);

  if (!visible) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
    }
    setVisible(false);
  }

  function dismiss() {
    localStorage.setItem("staff-install-dismissed", "1");
    setVisible(false);
  }

  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">Xodimlar ilovasini o&apos;rnating</p>
          <p className="mt-1 text-xs opacity-90">
            {isIos
              ? "Safari → Ulashish (Share) → «Home Screen» ga qo‘shish"
              : deferred
                ? "Telefoningizga ilova sifatida o‘rnating — tezkor kirish"
                : "Chrome menyu → «Add to Home screen» / «Ilovani o‘rnatish»"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {deferred && (
              <button
                type="button"
                onClick={() => void install()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white"
              >
                <Download className="h-3.5 w-3.5" />
                O&apos;rnatish
              </button>
            )}
            {isIos && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold opacity-80">
                <Share className="h-3.5 w-3.5" /> Share → Home Screen
              </span>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-semibold opacity-70 hover:opacity-100"
            >
              Keyinroq
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="rounded-lg p-1 opacity-60 hover:opacity-100" aria-label="Yopish">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

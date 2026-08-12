"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Mijoz/yetkazish PWA — bu yerda xodim o‘rnatish banneri CHIQMASIN */
function isCustomerAppPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/c\/[^/]+\/(app|online)(\/|$)/.test(pathname);
}

/** Platforma admin — o‘z install hinti bor, xodim banneri CHIQMASIN */
function isPlatformPath(pathname: string | null): boolean {
  return pathname === "/platform" || pathname?.startsWith("/platform/") === true;
}

/** Login sahifasida StaffInstallHint bor — ikki banner aralashmasin */
function isLoginPath(pathname: string | null): boolean {
  return pathname === "/login" || pathname?.startsWith("/login/") === true;
}

export function PwaRegister() {
  const pathname = usePathname();
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  const onCustomerApp = isCustomerAppPath(pathname);
  const onPlatform = isPlatformPath(pathname);
  const onLogin = isLoginPath(pathname);

  useEffect(() => {
    const hostname = window.location.hostname;
    const isLocalDev =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);

    if (isLocalDev) {
      navigator.serviceWorker?.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister();
      });
      return;
    }

    // Delivery / platforma — o‘z manifesti; umumiy SW xodim ilovasiga tegishli
    if (onCustomerApp || onPlatform) return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            worker?.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) {
                setUpdateReady(true);
              }
            });
          });
        })
        .catch(() => {});
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone;
    setInstalled(!!isStandalone);

    // O‘rnatish banneri faqat xodim zonasi (login emas — u yerda StaffInstallHint)
    if (onLogin) return;

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [onCustomerApp, onPlatform, onLogin]);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      setInstallEvent(null);
      setInstalled(true);
    }
  }

  function reloadUpdate() {
    navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  }

  if (onCustomerApp || onPlatform) return null;

  if (updateReady) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl bg-stone-900 px-4 py-3 text-white shadow-lg">
        <p className="text-sm font-medium">Yangilanish tayyor</p>
        <button
          type="button"
          onClick={reloadUpdate}
          className="mt-2 rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-stone-900"
        >
          Yangilash
        </button>
      </div>
    );
  }

  if (onLogin || installed || !installEvent) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl bg-amber-600 px-4 py-3 text-white shadow-lg">
      <p className="text-sm font-medium">Xodimlar ilovasini o&apos;rnating</p>
      <p className="mt-1 text-xs text-amber-100">
        Kassa, ofitsiant va oshxona — mijoz buyurtma ilovasidan alohida
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={install}
          className="rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-amber-700"
        >
          O&apos;rnatish
        </button>
        <button
          type="button"
          onClick={() => setInstallEvent(null)}
          className="rounded-lg px-3 py-1.5 text-sm text-amber-100"
        >
          Keyinroq
        </button>
      </div>
    </div>
  );
}

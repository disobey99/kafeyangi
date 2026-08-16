"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const HIDE_KEY = "hide_pwa_banner";
const SNOOZE_KEY = "pwa_banner_snooze_until";
const INSTALLED_KEY = "pwa_banner_installed";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 kun
const SW_URL = "/sw.js";

function readBannerAllowed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(HIDE_KEY) === "true") return false;
    if (localStorage.getItem(INSTALLED_KEY) === "1") return false;
    const until = Number(localStorage.getItem(SNOOZE_KEY));
    if (Number.isFinite(until) && Date.now() < until) return false;
  } catch {
    /* ignore */
  }
  return true;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(window.navigator as Navigator & { standalone?: boolean }).standalone
  );
}

function isLocalDevHost(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname)
  );
}

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

function watchWaitingWorker(
  worker: ServiceWorker | null,
  onReady: () => void,
) {
  if (!worker) return;
  if (worker.state === "installed") {
    onReady();
    return;
  }
  worker.addEventListener("statechange", () => {
    if (worker.state === "installed") onReady();
  });
}

export function PwaRegister() {
  const pathname = usePathname();
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [bannerAllowed, setBannerAllowed] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [updating, setUpdating] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const refreshingRef = useRef(false);

  const onCustomerApp = isCustomerAppPath(pathname);
  const onPlatform = isPlatformPath(pathname);
  const onLogin = isLoginPath(pathname);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (isLocalDevHost()) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      return;
    }

    let cancelled = false;
    let pollId = 0;
    let removeBeforeInstall: (() => void) | null = null;

    function markUpdateReady(reg: ServiceWorkerRegistration) {
      registrationRef.current = reg;
      if (reg.waiting && navigator.serviceWorker.controller) {
        setUpdateReady(true);
      }
    }

    void navigator.serviceWorker
      .register(SW_URL)
      .then((reg) => {
        if (cancelled) return;
        registrationRef.current = reg;
        markUpdateReady(reg);

        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          watchWaitingWorker(worker, () => {
            if (navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });

        void reg.update().catch(() => {});
        pollId = window.setInterval(() => {
          void reg.update().catch(() => {});
        }, 5 * 60 * 1000);
      })
      .catch(() => {});

    function onControllerChange() {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      void registrationRef.current?.update().catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisible);

    // Install banner holati — microtask (eslint: sync setState in effect)
    queueMicrotask(() => {
      if (cancelled) return;
      const standalone = isStandaloneDisplay();
      setInstalled(standalone);
      if (standalone) {
        try {
          localStorage.setItem(INSTALLED_KEY, "1");
        } catch {
          /* ignore */
        }
        setBannerAllowed(false);
        return;
      }

      const allowed = readBannerAllowed();
      setBannerAllowed(allowed);

      if (!onLogin && !onCustomerApp && !onPlatform && allowed) {
        function onBeforeInstall(e: Event) {
          e.preventDefault();
          if (!readBannerAllowed()) {
            setBannerAllowed(false);
            return;
          }
          setInstallEvent(e as BeforeInstallPromptEvent);
        }
        window.addEventListener("beforeinstallprompt", onBeforeInstall);
        removeBeforeInstall = () =>
          window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      }
    });

    return () => {
      cancelled = true;
      if (pollId) window.clearInterval(pollId);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      document.removeEventListener("visibilitychange", onVisible);
      removeBeforeInstall?.();
    };
  }, [onCustomerApp, onPlatform, onLogin]);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      try {
        localStorage.setItem(INSTALLED_KEY, "1");
      } catch {
        /* ignore */
      }
      setInstallEvent(null);
      setInstalled(true);
      setBannerAllowed(false);
    }
  }

  function later() {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    } catch {
      /* ignore */
    }
    setInstallEvent(null);
    setBannerAllowed(false);
  }

  function neverShow() {
    try {
      localStorage.setItem(HIDE_KEY, "true");
    } catch {
      /* ignore */
    }
    setInstallEvent(null);
    setBannerAllowed(false);
  }

  function applyUpdate() {
    const reg = registrationRef.current;
    const waiting = reg?.waiting;
    if (!waiting) {
      window.location.reload();
      return;
    }
    setUpdating(true);
    waiting.postMessage({ type: "SKIP_WAITING" });
    // controllerchange → reload; zaxira
    window.setTimeout(() => {
      if (!refreshingRef.current) window.location.reload();
    }, 2500);
  }

  // Yangi versiya — barcha sahifalarda (qayta o'rnatish shart emas)
  if (updateReady) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 z-[120] mx-auto max-w-md rounded-2xl bg-stone-950 px-4 py-3 text-white shadow-2xl ring-1 ring-white/10"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <RefreshCw className={`h-4 w-4 ${updating ? "animate-spin" : ""}`} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Yangi versiya mavjud!</p>
            <p className="mt-0.5 text-xs text-stone-300">
              Ilovani o&apos;chirib qayta o&apos;rnatish shart emas — bir marta
              yangilang.
            </p>
            <button
              type="button"
              disabled={updating}
              onClick={applyUpdate}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-stone-950 disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              {updating ? "Yangilanmoqda…" : "Yangilash"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (onCustomerApp || onPlatform) return null;
  if (onLogin || installed || !bannerAllowed || !installEvent) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl bg-amber-600 px-4 py-3 text-white shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">Xodimlar ilovasini o&apos;rnating</p>
          <p className="mt-1 text-xs text-amber-100">
            Kassa, ofitsiant va oshxona — mijoz buyurtma ilovasidan alohida
          </p>
        </div>
        <button
          type="button"
          onClick={neverShow}
          className="shrink-0 rounded-lg p-1 text-amber-100/80 hover:bg-white/10 hover:text-white"
          aria-label="Boshqa ko'rsatmaslik"
          title="Boshqa ko'rsatmaslik"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void install()}
          className="rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-amber-700"
        >
          O&apos;rnatish
        </button>
        <button
          type="button"
          onClick={later}
          className="rounded-lg px-3 py-1.5 text-sm text-amber-100 hover:bg-white/10"
        >
          Keyinroq
        </button>
        <button
          type="button"
          onClick={neverShow}
          className="rounded-lg px-3 py-1.5 text-sm text-amber-100/90 underline-offset-2 hover:underline"
        >
          Boshqa ko&apos;rsatmaslik
        </button>
      </div>
    </div>
  );
}

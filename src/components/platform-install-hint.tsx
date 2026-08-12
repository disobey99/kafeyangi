"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Download, Share, X } from "lucide-react";

type DeferredPrompt = { prompt: () => Promise<void> };

type InstallCtx = {
  standalone: boolean;
  openGuide: () => void;
};

const PlatformInstallContext = createContext<InstallCtx | null>(null);

function forceUnlockScroll() {
  if (typeof document === "undefined") return;
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
}

/** Bitta joyda manifest + modal — sahifa qotib qolmasin */
export function PlatformInstallProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<DeferredPrompt | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    forceUnlockScroll();

    const manifest = document.querySelector(
      'link[rel="manifest"]',
    ) as HTMLLinkElement | null;
    if (manifest) {
      manifest.href = "/platform.webmanifest";
    } else {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "/platform.webmanifest";
      document.head.appendChild(link);
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      !!(window.navigator as Navigator & { standalone?: boolean }).standalone;
    setStandalone(!!isStandalone);

    function onBip(e: Event) {
      e.preventDefault();
      const ev = e as Event & { prompt: () => Promise<void> };
      setDeferred({ prompt: () => ev.prompt() });
    }

    window.addEventListener("beforeinstallprompt", onBip);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      forceUnlockScroll();
    };
  }, []);

  const openGuide = useCallback(() => {
    forceUnlockScroll();
    setGuideOpen(true);
  }, []);

  const closeGuide = useCallback(() => {
    setGuideOpen(false);
    forceUnlockScroll();
  }, []);

  const ctx = useMemo(
    () => ({ standalone, openGuide }),
    [standalone, openGuide],
  );

  const isIos =
    mounted && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  async function runNativeInstall() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      closeGuide();
    } catch {
      /* yo'riqnoma ochiq qoladi */
    }
  }

  return (
    <PlatformInstallContext.Provider value={ctx}>
      {children}
      {mounted &&
        guideOpen &&
        createPortal(
          <div
            className="platform-install-modal-root"
            role="dialog"
            aria-modal="true"
            aria-labelledby="platform-install-title"
          >
            <button
              type="button"
              className="platform-install-modal-backdrop"
              aria-label="Yopish"
              onClick={closeGuide}
            />
            <div className="platform-install-modal">
              <div className="mb-3 flex items-start justify-between gap-2">
                <p
                  id="platform-install-title"
                  className="platform-title text-base font-bold"
                >
                  Uy ekraniga o&apos;rnatish
                </p>
                <button
                  type="button"
                  className="platform-muted shrink-0 rounded-lg p-1.5"
                  onClick={closeGuide}
                  aria-label="Yopish"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {isIos ? (
                <ol className="platform-install-steps">
                  <li>
                    Pastki{" "}
                    <Share className="inline h-4 w-4 align-text-bottom" />{" "}
                    <b>Ulashish</b> tugmasini bosing
                  </li>
                  <li>
                    <b>«Home Screen» ga qo&apos;shish</b> ni tanlang
                  </li>
                  <li>
                    <b>Add</b> ni bosing
                  </li>
                </ol>
              ) : (
                <ol className="platform-install-steps">
                  <li>
                    Brauzer menyusi <b>⋮</b> ni oching
                  </li>
                  <li>
                    <b>«Ilovani o&apos;rnatish»</b> yoki{" "}
                    <b>«Add to Home screen»</b>
                  </li>
                  <li>Tasdiqlang</li>
                </ol>
              )}

              {deferred && !isIos && (
                <button
                  type="button"
                  onClick={() => void runNativeInstall()}
                  className="platform-install-btn mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white"
                >
                  <Download className="h-4 w-4" />
                  O&apos;rnatish
                </button>
              )}

              <button
                type="button"
                onClick={closeGuide}
                className="mt-3 w-full rounded-xl border border-[var(--pf-border)] py-3 text-sm font-semibold text-[var(--pf-text)]"
              >
                Yopish
              </button>
            </div>
          </div>,
          document.body,
        )}
    </PlatformInstallContext.Provider>
  );
}

function useInstall() {
  const ctx = useContext(PlatformInstallContext);
  if (!ctx) {
    return {
      standalone: true,
      openGuide: () => {},
    };
  }
  return ctx;
}

export function PlatformInstallButton({ className = "" }: { className?: string }) {
  const { standalone, openGuide } = useInstall();
  if (standalone) return null;

  return (
    <button
      type="button"
      onClick={openGuide}
      className={`platform-install-icon-btn inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${className}`}
      title="Uy ekraniga o‘rnatish"
      aria-label="Uy ekraniga o‘rnatish"
    >
      <Download className="h-4 w-4" />
    </button>
  );
}

export function PlatformInstallHint() {
  const { standalone, openGuide } = useInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (standalone) return;
    if (localStorage.getItem("platform-install-dismissed") === "1") return;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;
    const t = window.setTimeout(() => setVisible(true), 800);
    return () => window.clearTimeout(t);
  }, [standalone]);

  if (!visible || standalone) return null;

  function dismiss() {
    localStorage.setItem("platform-install-dismissed", "1");
    setVisible(false);
  }

  return (
    <div className="platform-install-hint mb-4 rounded-2xl border px-4 py-3 text-sm md:hidden">
      <div className="flex items-start gap-3">
        <Download className="platform-accent-text mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="platform-title font-bold">
            Platforma ilovasini o&apos;rnating
          </p>
          <p className="platform-muted mt-1 text-xs">
            Yuqoridagi ↓ tugma yoki pastdagi «Qanday?»
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openGuide}
              className="platform-install-btn inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
            >
              Qanday o&apos;rnatiladi?
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="platform-muted text-xs font-semibold"
            >
              Keyinroq
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="platform-muted rounded-lg p-1"
          aria-label="Yopish"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

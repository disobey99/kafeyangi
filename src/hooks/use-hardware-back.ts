"use client";

import { useEffect, useRef } from "react";

type BackHandler = () => boolean;

const handlers = new Set<BackHandler>();

/**
 * Telefon / brauzer «ortga» tugmasi — qatlamni yopish.
 * `true` qaytarsa hodisa yutiladi (sahifadan chiqilmaydi).
 * Oxirgi ro'yxatdan o'tgan handler birinchi chaqiriladi (modal → panel).
 */
export function useHardwareBackHandler(handler: BackHandler, enabled = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const wrapped: BackHandler = () => handlerRef.current();
    handlers.add(wrapped);
    return () => {
      handlers.delete(wrapped);
    };
  }, [enabled]);
}

type HardwareBackGuardOptions = {
  enabled?: boolean;
  /** Asosiy oynada ortga — chiqishdan oldin so'rov */
  confirmLeave?: boolean | string;
  /** Tasdiqlanganda (default: logout + /login) */
  onConfirmLeave?: () => void | Promise<void>;
};

const DEFAULT_LEAVE_MSG =
  "Tizimdan chiqib login sahifasiga o'tasizmi?\n\nHa — chiqish\nBekor — ishda qolish";

/**
 * Xodim / admin shell: tizim «ortga» tugmasi.
 * Ichki qatlamlar yopiladi; asosiy oynada ixtiyoriy tasdiq so'raladi.
 */
export function useHardwareBackGuard(
  enabledOrOptions: boolean | HardwareBackGuardOptions = true,
) {
  const options: HardwareBackGuardOptions =
    typeof enabledOrOptions === "boolean"
      ? { enabled: enabledOrOptions }
      : enabledOrOptions;

  const confirmLeave = options.confirmLeave;
  const onConfirmLeaveRef = useRef(options.onConfirmLeave);
  onConfirmLeaveRef.current = options.onConfirmLeave;

  useEffect(() => {
    if (options.enabled === false || typeof window === "undefined") return;

    const marker = { kafeBackGuard: true as const };
    window.history.pushState(marker, "");
    let leaving = false;

    function onPopState() {
      if (leaving) return;

      const list = [...handlers].reverse();
      for (const h of list) {
        try {
          if (h()) {
            window.history.pushState(marker, "");
            return;
          }
        } catch {
          /* ignore broken handlers */
        }
      }

      // Asosiy oyna — avval tarixni qayta qo'yamiz (bekor qilinsa qoladi)
      window.history.pushState(marker, "");

      if (!confirmLeave) return;

      const msg =
        typeof confirmLeave === "string" ? confirmLeave : DEFAULT_LEAVE_MSG;

      if (!window.confirm(msg)) return;

      leaving = true;
      const custom = onConfirmLeaveRef.current;
      if (custom) {
        void Promise.resolve(custom()).catch(() => {
          leaving = false;
        });
        return;
      }

      void (async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {
          /* ignore */
        }
        window.location.replace("/login");
      })();
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [options.enabled, confirmLeave]);
}

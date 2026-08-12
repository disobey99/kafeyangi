"use client";

import { useCallback, useEffect, useRef } from "react";
import { STAFF_PIN_IDLE_MS } from "@/lib/staff-pin-constants";

export async function lockStaffScreen(cafeId: string) {
  await fetch(`/api/cafes/${cafeId}/staff/pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "lock" }),
  });
  window.dispatchEvent(new CustomEvent("kafe:staff-pin-locked"));
}

export function useStaffPinIdleLock(cafeId: string, enabled: boolean) {
  const lastActivityRef = useRef(Date.now());
  const lockingRef = useRef(false);

  const bumpActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    bumpActivity();

    let scrollAt = 0;
    function onScroll() {
      const now = Date.now();
      if (now - scrollAt < 1000) return;
      scrollAt = now;
      bumpActivity();
    }

    const passiveEvents = ["pointerdown", "touchstart", "keydown", "click"] as const;
    for (const event of passiveEvents) {
      window.addEventListener(event, bumpActivity, { passive: true });
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    function onUnlocked() {
      bumpActivity();
    }
    window.addEventListener("kafe:staff-pin-unlocked", onUnlocked);

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const storedTimeout = typeof window !== "undefined" ? localStorage.getItem("staff_pin_timeout_ms") : null;
      const timeoutMs = storedTimeout ? parseInt(storedTimeout, 10) : STAFF_PIN_IDLE_MS;
      if (timeoutMs === 0) return;
      if (Date.now() - lastActivityRef.current >= timeoutMs) {
        void lockStaffScreen(cafeId);
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    const timer = window.setInterval(() => {
      const storedTimeout = typeof window !== "undefined" ? localStorage.getItem("staff_pin_timeout_ms") : null;
      const timeoutMs = storedTimeout ? parseInt(storedTimeout, 10) : STAFF_PIN_IDLE_MS;
      if (timeoutMs === 0) return;
      if (Date.now() - lastActivityRef.current < timeoutMs) return;
      if (lockingRef.current) return;
      lockingRef.current = true;
      void lockStaffScreen(cafeId).finally(() => {
        lockingRef.current = false;
        lastActivityRef.current = Date.now();
      });
    }, 15_000);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("kafe:staff-pin-unlocked", onUnlocked);
      document.removeEventListener("visibilitychange", onVisible);
      for (const event of passiveEvents) {
        window.removeEventListener(event, bumpActivity);
      }
      window.removeEventListener("scroll", onScroll);
    };
  }, [bumpActivity, cafeId, enabled]);
}

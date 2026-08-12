"use client";

import { useEffect } from "react";

/** Qurilma chiqarib yuborilganda sessiyani tekshirib login ga yo'naltiradi */
export function SessionWatchdog() {
  useEffect(() => {
    let stopped = false;

    async function check() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (stopped) return;
        if (res.status === 401 || !data?.user) {
          const path = window.location.pathname;
          if (!path.startsWith("/login")) {
            window.location.replace(`/login?next=${encodeURIComponent(path)}`);
          }
        }
      } catch {
        /* ignore */
      }
    }

    void check();
    const t = window.setInterval(() => void check(), 3000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}

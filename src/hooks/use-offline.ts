"use client";

import { useCallback, useEffect, useState } from "react";
import { getPendingActions, syncPendingActions } from "@/lib/offline-store";

export function useOffline() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPending = useCallback(async () => {
    const items = await getPendingActions();
    setPendingCount(items.length);
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    refreshPending();

    async function handleOnline() {
      setOnline(true);
      await syncPendingActions();
      await refreshPending();
      window.dispatchEvent(new CustomEvent("kafe:synced"));
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("kafe:offline-queue-changed", refreshPending);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("kafe:offline-queue-changed", refreshPending);
    };
  }, [refreshPending]);

  return { online, pendingCount, refreshPending };
}

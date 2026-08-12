"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearTableGuestSession,
  getStoredVisitToken,
  storeVisitToken,
  tableVisitSessionKey,
} from "@/lib/customer-table-session";

type GuestVisitState = {
  visitToken: string | null;
  orderingAllowed: boolean;
  sessionClosed: boolean;
  tableBusy: boolean;
  loading: boolean;
  error: string | null;
};

export function useGuestTableVisit(tableId: string, qrToken: string) {
  const [state, setState] = useState<GuestVisitState>({
    visitToken: null,
    orderingAllowed: false,
    sessionClosed: false,
    tableBusy: false,
    loading: true,
    error: null,
  });

  const sync = useCallback(async () => {
    const stored = getStoredVisitToken(qrToken);
    try {
      const res = await fetch(`/api/tables/${tableId}/guest-visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: qrToken, visitToken: stored ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState((s) => ({
          ...s,
          loading: false,
          orderingAllowed: false,
          error: data.error ?? "Sessiya xatosi",
        }));
        return;
      }

      if (data.sessionClosed || data.tableBusy) {
        if (data.sessionClosed) {
          clearTableGuestSession(qrToken);
        } else if (data.tableBusy && typeof window !== "undefined") {
          sessionStorage.removeItem(tableVisitSessionKey(qrToken));
        }
      } else if (data.visitToken && data.orderingAllowed) {
        storeVisitToken(qrToken, data.visitToken);
      }

      setState({
        visitToken: data.orderingAllowed ? (data.visitToken ?? stored) : null,
        orderingAllowed: Boolean(data.orderingAllowed),
        sessionClosed: Boolean(data.sessionClosed),
        tableBusy: Boolean(data.tableBusy),
        loading: false,
        error: null,
      });
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        orderingAllowed: false,
        error: "Ulanish xatosi",
      }));
    }
  }, [tableId, qrToken]);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") sync();
    }, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sync]);

  return { ...state, refreshVisit: sync };
}

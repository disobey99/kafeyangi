"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, Receipt, X } from "lucide-react";
import { clearTableGuestSession } from "@/lib/customer-table-session";
import type { MenuUiLabels } from "@/lib/menu-ui-labels";
import { CustomerStaffRatingModal } from "@/components/customer-staff-rating-modal";

export function CustomerTableActions({
  tableId,
  qrToken,
  visitToken,
  ui,
  variant = "floating",
  disabled = false,
}: {
  tableId: string;
  qrToken: string;
  visitToken?: string | null;
  ui: MenuUiLabels;
  variant?: "floating" | "inline";
  disabled?: boolean;
}) {
  const [waiterLoading, setWaiterLoading] = useState(false);
  const [billLoading, setBillLoading] = useState(false);
  const [waiterSent, setWaiterSent] = useState(false);
  const [billSent, setBillSent] = useState(false);
  const [canRequestBill, setCanRequestBill] = useState(false);
  const [billBlockReason, setBillBlockReason] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fabOpen, setFabOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [waiterName, setWaiterName] = useState<string | null>(null);
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fabOpen) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setFabOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [fabOpen]);

  const loadSession = useCallback(async () => {
    if (!visitToken) return;
    const params = new URLSearchParams({ token: qrToken, visitToken });
    const res = await fetch(`/api/tables/${tableId}/guest-session?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.sessionClosed) {
      clearTableGuestSession(qrToken);
    }
    setCanRequestBill(Boolean(data.canRequestBill));
    setBillBlockReason(data.billBlockReason ?? null);
    setBillSent(data.table?.status === "BILL_REQUESTED" || data.sessionClosed);
  }, [tableId, qrToken, visitToken]);

  useEffect(() => {
    loadSession();
    const interval = setInterval(loadSession, 4000);
    function onSelfReadyAcked() {
      loadSession();
    }
    function onSessionCleared() {
      setBillSent(true);
      setCanRequestBill(false);
    }
    window.addEventListener("kafe:self-ready-acked", onSelfReadyAcked);
    window.addEventListener("kafe:guest-session-cleared", onSessionCleared);
    return () => {
      clearInterval(interval);
      window.removeEventListener("kafe:self-ready-acked", onSelfReadyAcked);
      window.removeEventListener("kafe:guest-session-cleared", onSessionCleared);
    };
  }, [loadSession]);

  async function callWaiter() {
    if (disabled) return;
    setWaiterLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tables/${tableId}/call-waiter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: qrToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || ui.genericError);
        return;
      }
      setWaiterSent(true);
      setTimeout(() => setWaiterSent(false), 10000);
      setFabOpen(false);
    } catch {
      setError(ui.connectionError);
    } finally {
      setWaiterLoading(false);
    }
  }

  async function requestBill() {
    if (disabled) return;
    setBillLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tables/${tableId}/request-bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: qrToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || ui.genericError);
        return;
      }
      setBillSent(true);
      setFabOpen(false);
      setWaiterName(data.waiter?.name ?? null);
      setRatingOpen(true);
      clearTableGuestSession(qrToken);
    } catch {
      setError(ui.connectionError);
    } finally {
      setBillLoading(false);
    }
  }

  async function submitRating(score: number, comment: string) {
    await fetch(`/api/tables/${tableId}/staff-rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: qrToken, score, comment }),
    });
  }

  const billBtnClass =
    variant === "inline"
      ? "customer-menu-action-btn customer-menu-action-bill flex-1"
      : `inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition ${
          billSent ? "bg-red-500 text-white" : "bg-white text-stone-800 ring-1 ring-stone-200 hover:bg-stone-50"
        }`;

  const waiterBtnClass =
    variant === "inline"
      ? "customer-menu-action-btn customer-menu-action-waiter flex-1"
      : `inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition ${
          waiterSent ? "bg-green-500 text-white" : "bg-stone-800 text-white hover:bg-stone-900"
        }`;

  const billLabel = billSent ? ui.billSent : billLoading ? "..." : ui.requestBill;
  const waiterLabel = waiterSent ? ui.waiterSent : waiterLoading ? "..." : ui.callWaiter;

  const billIcon = billSent ? (
    <Check className="h-4 w-4 shrink-0" aria-hidden />
  ) : (
    <Receipt className="h-4 w-4 shrink-0" aria-hidden />
  );

  const waiterIcon = waiterSent ? (
    <Check className="h-4 w-4 shrink-0" aria-hidden />
  ) : (
    <Bell className="h-4 w-4 shrink-0" aria-hidden />
  );

  const actionPanel = (
    <>
      <button
        type="button"
        onClick={requestBill}
        disabled={disabled || billLoading || billSent || !canRequestBill}
        title={!canRequestBill ? billBlockReason ?? undefined : undefined}
        className={`${billBtnClass}${!canRequestBill && !billSent ? " opacity-50" : ""}`}
      >
        {billIcon}
        <span>{billLabel}</span>
      </button>
      <button
        type="button"
        onClick={callWaiter}
        disabled={disabled || waiterLoading || waiterSent}
        className={waiterBtnClass}
      >
        {waiterIcon}
        <span>{waiterLabel}</span>
      </button>
    </>
  );

  if (variant === "inline") {
    return (
      <>
        <CustomerStaffRatingModal
          open={ratingOpen}
          waiterName={waiterName}
          onClose={() => setRatingOpen(false)}
          onSubmit={submitRating}
        />
        {!ratingOpen && (
          <div className="mb-3 flex justify-end" ref={fabRef}>
        {!fabOpen ? (
          <button
            type="button"
            onClick={() => setFabOpen(true)}
            className={`customer-table-fab-bell customer-table-fab-bell-inline ${waiterSent ? "is-success" : ""}`}
            aria-expanded={false}
            aria-label={ui.callWaiter}
          >
            {waiterSent ? (
              <Check className="h-5 w-5" aria-hidden />
            ) : (
              <Bell className="h-5 w-5" aria-hidden />
            )}
          </button>
        ) : (
          <div className="w-full">
            <div className="customer-table-fab-panel mb-2 w-full">
              <div className="flex items-center justify-between gap-2 px-1 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
                  {ui.table}
                </span>
                <button
                  type="button"
                  onClick={() => setFabOpen(false)}
                  className="customer-table-fab-close"
                  aria-label={ui.hubClose}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">{actionPanel}</div>
            </div>
          </div>
        )}
        {billBlockReason && !billSent && fabOpen && (
          <p className="mt-2 text-center text-xs font-medium text-amber-200">{billBlockReason}</p>
        )}
        {error && (
          <p className="mt-2 text-center text-xs font-medium text-red-300">{error}</p>
        )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <CustomerStaffRatingModal
        open={ratingOpen}
        waiterName={waiterName}
        onClose={() => setRatingOpen(false)}
        onSubmit={submitRating}
      />
      {!ratingOpen && (
    <div ref={fabRef} className="customer-table-fab fixed bottom-20 right-4 z-10 flex flex-col items-end gap-2">
      {fabOpen && (
        <div className="customer-table-fab-panel flex flex-col items-stretch gap-2">
          {actionPanel}
        </div>
      )}
      <button
        type="button"
        onClick={() => setFabOpen((o) => !o)}
        className={`customer-table-fab-bell ${fabOpen ? "is-open" : ""} ${waiterSent ? "is-success" : ""}`}
        aria-expanded={fabOpen}
        aria-label={fabOpen ? ui.hubClose : ui.callWaiter}
      >
        {fabOpen ? (
          <X className="h-6 w-6" aria-hidden />
        ) : waiterSent ? (
          <Check className="h-6 w-6" aria-hidden />
        ) : (
          <Bell className="h-6 w-6" aria-hidden />
        )}
      </button>
      {billBlockReason && !billSent && fabOpen && (
        <p className="max-w-[240px] rounded-lg bg-amber-50 px-2 py-1 text-right text-xs text-amber-800 shadow ring-1 ring-amber-200">
          {billBlockReason}
        </p>
      )}
      {error && fabOpen && (
        <p className="max-w-[220px] rounded-lg bg-white px-2 py-1 text-right text-xs text-red-600 shadow ring-1 ring-stone-200">
          {error}
        </p>
      )}
    </div>
      )}
    </>
  );
}

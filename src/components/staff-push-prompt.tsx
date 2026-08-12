"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, ChevronDown, Volume2, X } from "lucide-react";
import { StaffAlertLocalePicker } from "@/components/staff-alert-locale-picker";
import { enableOrderSound, isOrderSoundEnabled } from "@/lib/order-notifications";
import {
  isPushEnabledLocally,
  isPushSupported,
  subscribeCafePushDetailed,
  syncExistingPushSubscription,
} from "@/lib/push-client";
import { requestStaffNotificationPermission } from "@/lib/staff-local-notify";
import {
  clearPushPromptSnooze,
  getPushPromptDismissedAt,
  pushLimitationsForRole,
  shouldShowPushPrompt,
  snoozePushPrompt,
} from "@/lib/staff-push-prompt";

const MINIMIZED_KEY = "kafe-push-prompt-minimized";

type StaffRole = "waiter" | "cashier" | "kitchen" | "staff" | "courier";

export function StaffPushPrompt({
  cafeId,
  role = "staff",
}: {
  cafeId: string;
  role?: StaffRole;
}) {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [ready, setReady] = useState(false);

  const pushSupported = isPushSupported();
  const limitations = pushLimitationsForRole(role);

  const refresh = useCallback(async () => {
    let minimizedNow = false;
    try {
      minimizedNow = sessionStorage.getItem(MINIMIZED_KEY) === "1";
    } catch {
      /* ignore */
    }
    setMinimized(minimizedNow);

    // Push qo'llab-quvvatlanmasa — faqat ovoz eslatmasi
    if (!pushSupported) {
      setPermission("unsupported");
      if (isOrderSoundEnabled()) {
        setOpen(false);
        setCompact(false);
        setPushEnabled(true);
        setReady(true);
        return;
      }
      const dismissedAt = getPushPromptDismissedAt();
      // Modal faqat birinchi marta / snooze tugaganda
      const wantModal = shouldShowPushPrompt({
        pushSupported: true,
        pushEnabled: false,
        permission: "default",
      });
      setOpen(wantModal && !dismissedAt && !minimizedNow);
      setCompact(true); // snooze bo'lsa ham banner qoladi
      setPushEnabled(false);
      setReady(true);
      return;
    }

    const perm = Notification.permission;
    setPermission(perm);

    let enabled = isPushEnabledLocally() && perm === "granted";
    if (enabled) {
      enabled = await syncExistingPushSubscription(cafeId);
    }
    setPushEnabled(enabled);

    if (enabled && perm === "granted") {
      setOpen(false);
      setCompact(false);
      setReady(true);
      return;
    }

    // Yoqilmagan — doim eslatma (banner yoki modal)
    const wantModal = shouldShowPushPrompt({
      pushSupported: true,
      pushEnabled: enabled,
      permission: perm,
    });

    if (perm === "denied") {
      // Bloklangan — modal yoki banner
      setOpen(wantModal && !minimizedNow);
      setCompact(true);
      setReady(true);
      return;
    }

    if (wantModal && !minimizedNow) {
      setOpen(true);
      setCompact(false);
    } else {
      setOpen(false);
      setCompact(true);
    }
    setReady(true);
  }, [cafeId, pushSupported]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh();
    }, 400);
    return () => window.clearTimeout(t);
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
    }, 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [refresh]);

  function minimizeBanner() {
    setMinimized(true);
    setOpen(false);
    setCompact(true);
    try {
      sessionStorage.setItem(MINIMIZED_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function expandBanner() {
    setMinimized(false);
    setCompact(true);
    setOpen(false);
    try {
      sessionStorage.removeItem(MINIMIZED_KEY);
    } catch {
      /* ignore */
    }
  }

  function clearMinimized() {
    setMinimized(false);
    try {
      sessionStorage.removeItem(MINIMIZED_KEY);
    } catch {
      /* ignore */
    }
  }

  async function enable() {
    setBusy(true);
    setError("");
    try {
      enableOrderSound();
      window.dispatchEvent(new Event("kafe:alerts-enabled"));

      // Avval native / brauzer ruxsat — chaqiriq popup uchun majburiy
      const nativeOk = await requestStaffNotificationPermission();

      if (!pushSupported) {
        if (!nativeOk) {
          setError(
            "Bildirishnoma ruxsati berilmadi. Telefon sozlamalaridan Nookline → Bildirishnomalar ni yoqing.",
          );
          return;
        }
        clearPushPromptSnooze();
        setOpen(false);
        setCompact(false);
        clearMinimized();
        setPushEnabled(true);
        setPermission(
          typeof Notification !== "undefined" ? Notification.permission : "granted",
        );
        return;
      }

      if (Notification.permission === "denied") {
        // APKda LocalNotifications ishlashi mumkin
        if (nativeOk) {
          clearPushPromptSnooze();
          setPushEnabled(true);
          setOpen(false);
          setCompact(false);
          clearMinimized();
          return;
        }
        setError(
          "Brauzer ruxsatni bloklagan. Telefon sozlamalaridan bildirishnomalarni yoqing, keyin qayta urinib ko'ring.",
        );
        return;
      }

      const result = await subscribeCafePushDetailed(cafeId);
      if (!result.ok) {
        if (nativeOk) {
          clearPushPromptSnooze();
          setPushEnabled(true);
          setOpen(false);
          setCompact(false);
          clearMinimized();
          return;
        }
        setError(result.error);
        return;
      }

      clearPushPromptSnooze();
      setPushEnabled(true);
      setOpen(false);
      setCompact(false);
      clearMinimized();
      window.dispatchEvent(new Event("kafe:alerts-enabled"));
    } finally {
      setBusy(false);
    }
  }

  function later() {
    snoozePushPrompt();
    setOpen(false);
    setCompact(true);
    // Modal yopiladi, sariq banner qoladi
    clearMinimized();
  }

  if (!ready) return null;
  if (pushEnabled && (permission === "granted" || !pushSupported)) return null;

  const title =
    role === "cashier"
      ? "Buyurtma bildirishnomasini yoqing"
      : role === "kitchen"
        ? "Oshxona bildirishnomasini yoqing"
        : role === "courier"
          ? "Yetkazish bildirishnomasini yoqing"
          : "Chaqiriq bildirishnomasini yoqing";

  const showBanner = compact && !open;

  return (
    <>
      {showBanner && minimized && (
        <button
          type="button"
          onClick={expandBanner}
          title="Bildirishnoma o'chiq — ochish"
          aria-label="Bildirishnoma eslatmasini ochish"
          className="fixed bottom-20 left-4 z-[90] flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-stone-950 shadow-lg ring-2 ring-amber-300/80 hover:bg-amber-400 lg:bottom-5 lg:left-5"
        >
          <BellOff className="h-5 w-5" />
        </button>
      )}

      {showBanner && !minimized && (
        <div className="fixed bottom-20 left-4 z-[90] flex max-w-[min(100%-2rem,20rem)] items-stretch gap-1 rounded-2xl bg-amber-500 p-1 shadow-lg lg:bottom-5 lg:left-5">
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setCompact(false);
            }}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-stone-950 hover:bg-amber-400/50"
          >
            <BellOff className="h-5 w-5 shrink-0" />
            <span>
              Bildirishnoma o&apos;chiq — ekran qulflansa xabar kelmasligi mumkin.{" "}
              <span className="underline">Yoqish</span>
            </span>
          </button>
          <button
            type="button"
            onClick={minimizeBanner}
            title="Ixchamlashtirish"
            aria-label="Ixchamlashtirish"
            className="flex shrink-0 items-center justify-center rounded-xl px-2.5 text-stone-950/80 hover:bg-amber-400/60 hover:text-stone-950"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-push-title"
            className="w-full max-w-md rounded-2xl bg-[var(--dp-card,#fff)] p-5 shadow-2xl ring-1 ring-black/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                  <Bell className="h-5 w-5" />
                </span>
                <div>
                  <h2
                    id="staff-push-title"
                    className="text-lg font-extrabold text-[var(--dp-text,#111)]"
                  >
                    {title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--dp-muted,#666)]">
                    Bir marta ruxsat bering — telefon qulflangan yoki boshqa ilovada
                    bo&apos;lsangiz ham xabar keladi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={later}
                className="rounded-lg p-1 text-[var(--dp-muted)] hover:bg-black/5"
                aria-label="Yopish"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-red-500/8 px-3 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                Yoqilmasa nima bo&apos;ladi
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-[var(--dp-text,#222)]">
                {limitations.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-xl bg-stone-100/80 px-3 py-3 dark:bg-stone-800/60">
              <StaffAlertLocalePicker />
              <p className="mt-2 text-[11px] text-[var(--dp-muted,#666)]">
                Yangi buyurtma ovozi shu tilda aytiladi (o‘zbek / rus / ingliz).
              </p>
            </div>

            {permission === "denied" && (
              <p className="mt-3 text-sm text-amber-700">
                Brauzer bildirishnomani bloklagan. Chrome sozlamalaridan sayt uchun
                Notifications → Allow qiling.
              </p>
            )}

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                disabled={busy || permission === "denied"}
                onClick={() => void enable()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--dp-accent,#d97706)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                <Volume2 className="h-4 w-4" />
                {busy ? "Yoqilmoqda…" : "Bildirishnomani yoqish"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={later}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-[var(--dp-muted)] ring-1 ring-[var(--dp-border,#ddd)] hover:bg-black/5"
              >
                Keyinroq
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-[var(--dp-muted)]">
              «Keyinroq» — modal yopiladi, pastda sariq eslatma qoladi
            </p>
          </div>
        </div>
      )}
    </>
  );
}

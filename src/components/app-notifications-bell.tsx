"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Headphones,
  Heart,
  Info,
  MonitorSmartphone,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import { usePlatformRealtime } from "@/hooks/use-platform-realtime";
import { SupportChatPanel } from "@/components/support-chat-panel";

type NotificationItem = {
  id: string;
  kind: "INSIGHT" | "PRAISE" | "COMFORT" | "SYSTEM" | "SUPPORT";
  title: string;
  body: string;
  cafeId: string | null;
  cafeName: string | null;
  readAt: string | null;
  createdAt: string;
};

type ApprovalRequest = {
  id: string;
  deviceLabel: string;
  ipAddress: string | null;
  createdAt: string;
};

const kindIcon = {
  INSIGHT: TrendingUp,
  PRAISE: Sparkles,
  COMFORT: Heart,
  SYSTEM: Info,
  SUPPORT: Headphones,
} as const;

const kindTone = {
  INSIGHT: "text-violet-400 bg-violet-500/15",
  PRAISE: "text-emerald-400 bg-emerald-500/15",
  COMFORT: "text-sky-400 bg-sky-500/15",
  SYSTEM: "text-stone-400 bg-stone-500/15",
  SUPPORT: "text-amber-400 bg-amber-500/15",
} as const;

export function AppNotificationsBell({
  cafeId,
  className = "",
  placement = "default",
}: {
  cafeId?: string;
  className?: string;
  placement?: "default" | "sidebar";
}) {
  const router = useRouter();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [unread, setUnread] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cafeSupportOpen, setCafeSupportOpen] = useState(false);

  const totalBadge = unread + approvals.length;
  const isPlatformBell = !cafeId;

  function dismissSupportFromBell(n: NotificationItem) {
    const targetCafe = n.cafeId ?? cafeId ?? null;
    setItems((prev) => {
      const next = prev.filter((x) => {
        if (x.kind !== "SUPPORT") return true;
        if (targetCafe) return x.cafeId !== targetCafe;
        return x.id !== n.id;
      });
      const removedUnread = prev.filter(
        (x) =>
          !x.readAt &&
          x.kind === "SUPPORT" &&
          (targetCafe ? x.cafeId === targetCafe : x.id === n.id),
      ).length;
      setUnread((u) => Math.max(0, u - removedUnread));
      return next;
    });
  }

  function openSupportChat(n: NotificationItem) {
    dismissSupportFromBell(n);
    setOpen(false);
    if (isPlatformBell) {
      const target = n.cafeId
        ? `/platform/support?cafe=${encodeURIComponent(n.cafeId)}`
        : "/platform/support";
      router.push(target);
      return;
    }
    setCafeSupportOpen(true);
  }

  const loadNotifications = useCallback(async () => {
    try {
      const q = cafeId ? `?cafeId=${encodeURIComponent(cafeId)}` : "";
      const res = await fetch(`/api/notifications${q}`);
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      /* ignore */
    }
  }, [cafeId]);

  // Server flag (DEVICE_LOGIN_APPROVAL) clientga kelmaydi — so'rovlarni har doim API dan yuklaymiz
  const loadApprovals = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/login-approvals");
      if (!res.ok) return;
      const data = await res.json();
      setApprovals(data.requests ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadNotifications(), loadApprovals()]);
  }, [loadNotifications, loadApprovals]);

  useEffect(() => {
    setMounted(true);
    void loadAll();
    const t = setInterval(() => void loadAll(), 30_000);
    return () => clearInterval(t);
  }, [loadAll]);

  useCafeRealtime(
    cafeId ?? "",
    (event) => {
      if (event.type === "login.approval") void loadApprovals();
      if (event.type === "support.message") void loadNotifications();
    },
    { enabled: Boolean(cafeId) },
  );

  usePlatformRealtime(
    (event) => {
      if (event.type === "support.message") void loadNotifications();
    },
    { enabled: !cafeId },
  );

  function updatePanelPosition() {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const width = Math.min(380, window.innerWidth - 16);
    const spaceBelow = window.innerHeight - r.bottom - 16;
    const spaceAbove = r.top - 16;
    const openUpward =
      placement === "sidebar" || (spaceBelow < 160 && spaceAbove > spaceBelow);

    if (openUpward) {
      setPanelStyle({
        position: "fixed",
        left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
        bottom: window.innerHeight - r.top + 8,
        width,
        maxHeight: Math.min(480, Math.max(120, spaceAbove)),
        zIndex: 9999,
      });
      return;
    }

    const left = Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8);
    setPanelStyle({
      position: "fixed",
      left,
      top: r.bottom + 8,
      width,
      maxHeight: Math.min(480, Math.max(120, spaceBelow)),
      zIndex: 9999,
    });
  }

  function toggleOpen() {
    if (!open) {
      updatePanelPosition();
      void loadAll();
      if (unread > 0) void markNotificationsRead();
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    updatePanelPosition();
    const onResize = () => updatePanelPosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, placement]);

  async function markNotificationsRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setItems((prev) => {
      const next = prev.map((n) =>
        n.kind === "SUPPORT"
          ? n
          : { ...n, readAt: n.readAt ?? new Date().toISOString() },
      );
      setUnread(next.filter((n) => !n.readAt).length);
      return next;
    });
  }

  async function actApproval(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/auth/login-approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setApprovals((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setBusyId(null);
    }
  }

  const panel = open && mounted ? (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[9998] bg-black/20"
        aria-label="Yopish"
        onClick={() => setOpen(false)}
      />
      <div
        style={panelStyle}
        className="flex flex-col overflow-hidden rounded-2xl border border-[var(--dp-sidebar-border,theme(colors.stone.200))] bg-[var(--dp-sidebar,theme(colors.white))] shadow-2xl"
        role="dialog"
        aria-label="Bildirishnomalar"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--dp-sidebar-border,theme(colors.stone.100))] px-4 py-3">
          <p className="font-bold text-[var(--dp-sidebar-fg,theme(colors.stone.900))]">
            Bildirishnomalar
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[var(--dp-sidebar-muted,theme(colors.stone.400))]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {approvals.length > 0 && (
            <div className="border-b border-[var(--dp-sidebar-border,theme(colors.stone.100))] p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--dp-sidebar-muted,theme(colors.stone.500))]">
                Kirish so&apos;rovlari
              </p>
              <ul className="space-y-2">
                {approvals.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-[var(--dp-sidebar-border,theme(colors.stone.200))] bg-[var(--dp-nav-hover,theme(colors.stone.50))] p-3"
                  >
                    <div className="flex items-start gap-2">
                      <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--dp-sidebar-fg,theme(colors.stone.900))]">
                          {r.deviceLabel}
                        </p>
                        <p className="text-[11px] text-[var(--dp-sidebar-muted,theme(colors.stone.500))]">
                          Yangi qurilmadan kirish
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void actApproval(r.id, "approve")}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Tasdiqlash
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void actApproval(r.id, "reject")}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600/90 px-2 py-1.5 text-xs font-semibold text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                        Rad etish
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {items.length === 0 && approvals.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[var(--dp-sidebar-muted,theme(colors.stone.500))]">
              Hozircha xabar yo&apos;q
            </p>
          ) : (
            items.map((n) => {
              const Icon = kindIcon[n.kind];
              const isSupport = n.kind === "SUPPORT";
              const content = (
                <div className="flex gap-3">
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${kindTone[n.kind]}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--dp-sidebar-fg,theme(colors.stone.900))]">
                      {n.title}
                    </p>
                    <p className="text-[11px] font-medium text-[var(--dp-sidebar-muted,theme(colors.stone.500))]">
                      {new Date(n.createdAt).toLocaleDateString("uz-UZ", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {n.cafeName && (
                      <p className="text-[11px] text-[var(--dp-sidebar-muted,theme(colors.stone.500))]">
                        {n.cafeName}
                      </p>
                    )}
                    <p className="mt-1 text-xs leading-relaxed text-[var(--dp-sidebar-muted,theme(colors.stone.600))]">
                      {n.body}
                    </p>
                    {isSupport && (
                      <p className="mt-1.5 text-[11px] font-semibold text-violet-500">
                        Chatni ochish →
                      </p>
                    )}
                  </div>
                </div>
              );

              if (isSupport) {
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openSupportChat(n)}
                    className={`block w-full border-b border-[var(--dp-sidebar-border,theme(colors.stone.50))] px-4 py-3 text-left transition hover:bg-violet-500/10 ${
                      !n.readAt ? "bg-violet-500/10" : ""
                    }`}
                  >
                    {content}
                  </button>
                );
              }

              return (
                <div
                  key={n.id}
                  className={`border-b border-[var(--dp-sidebar-border,theme(colors.stone.50))] px-4 py-3 ${
                    !n.readAt ? "bg-violet-500/10" : ""
                  }`}
                >
                  {content}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  ) : null;

  const cafeSupportPanel =
    cafeSupportOpen && mounted && cafeId ? (
      <>
        <button
          type="button"
          className="fixed inset-0 z-[9998] bg-black/25"
          aria-label="Yopish"
          onClick={() => setCafeSupportOpen(false)}
        />
        <div
          className="support-popup fixed left-1/2 top-1/2 z-[9999] w-[min(380px,calc(100vw-16px))] -translate-x-1/2 -translate-y-1/2"
          role="dialog"
          aria-label="Qo'llab-quvvatlash"
        >
          <div className="support-popup-head">
            <div className="min-w-0">
              <p className="support-popup-title">Qo&apos;llab-quvvatlash</p>
              <p className="support-popup-subtitle">Tizim orqali yozing — tez javob olasiz</p>
            </div>
            <button
              type="button"
              onClick={() => setCafeSupportOpen(false)}
              className="support-popup-close"
              aria-label="Yopish"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="support-popup-body">
            <SupportChatPanel
              cafeId={cafeId}
              viewer="cafe"
              apiBase={`/api/support/chat?cafeId=${encodeURIComponent(cafeId)}`}
              variant="popup"
            />
          </div>
        </div>
      </>
    ) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        className={`login-approvals-bell relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition hover:opacity-90 ${
          placement === "sidebar"
            ? "border-[var(--dp-sidebar-border)] bg-[var(--dp-nav-hover)] text-[var(--dp-sidebar-fg)]"
            : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
        } ${totalBadge > 0 ? "has-items" : ""}`}
        aria-label="Bildirishnomalar"
        title="Bildirishnomalar"
      >
        <Bell className="h-4 w-4" strokeWidth={2.25} />
        {totalBadge > 0 && (
          <span className="login-approvals-badge absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </button>

      {mounted && panel ? createPortal(panel, document.body) : null}
      {mounted && cafeSupportPanel ? createPortal(cafeSupportPanel, document.body) : null}
    </div>
  );
}

/** @deprecated AppNotificationsBell ishlating */
export function LoginApprovalsBell({
  cafeId,
  className = "",
}: {
  cafeId?: string;
  className?: string;
}) {
  return <AppNotificationsBell cafeId={cafeId} className={className} />;
}

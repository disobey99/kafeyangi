"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, MonitorSmartphone, Shield, X } from "lucide-react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import { getClientDeviceLabel, getOrCreateDeviceId } from "@/lib/device-client";

type ApprovalRequest = {
  id: string;
  deviceLabel: string;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
};

export function LoginApprovalsBell({
  cafeId,
  className = "",
}: {
  cafeId?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const trustedOnce = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/login-approvals");
      if (!res.ok) return;
      const data = await res.json();
      const list: ApprovalRequest[] = data.requests ?? [];

      const fresh = list.filter((r) => !knownIds.current.has(r.id));
      for (const r of list) knownIds.current.add(r.id);
      if (fresh.length > 0 || list.length > 0) {
        setOpen(true);
      }
      if (fresh.length > 0) {
        try {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          const ctx = new Ctx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = 880;
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.value = 0.08;
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        } catch {
          /* ignore */
        }
      }

      setRequests(list);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (trustedOnce.current) return;
    trustedOnce.current = true;
    const deviceId = getOrCreateDeviceId();
    if (!deviceId) return;
    void fetch("/api/auth/trust-device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        deviceLabel: getClientDeviceLabel(),
      }),
    });
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 2500);
    return () => window.clearInterval(t);
  }, [load]);

  // Chiqarib yuborilgan qurilma — sessiyani tekshirib login ga yo'naltirish
  useEffect(() => {
    const t = window.setInterval(async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (!data?.user) {
          const path = window.location.pathname;
          if (!path.startsWith("/login")) {
            window.location.replace(`/login?next=${encodeURIComponent(path)}`);
          }
        }
      } catch {
        /* ignore */
      }
    }, 4000);
    return () => window.clearInterval(t);
  }, []);

  useCafeRealtime(
    cafeId ?? "",
    (event) => {
      if (event.type === "login.approval") void load();
    },
    { enabled: Boolean(cafeId) },
  );

  async function act(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/auth/login-approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setRequests((prev) => {
          const next = prev.filter((r) => r.id !== id);
          if (next.length === 0) setOpen(false);
          return next;
        });
        knownIds.current.delete(id);
      }
    } finally {
      setBusyId(null);
    }
  }

  const count = requests.length;
  const latest = requests[0];

  return (
    <div className={`login-approvals-wrap ${className}`}>
      <button
        type="button"
        className={`login-approvals-bell ${count > 0 ? "has-items" : ""}`}
        onClick={() => {
          setOpen((v) => !v);
          void load();
        }}
        aria-label="Kirish bildirishnomalari"
        title="Kirish bildirishnomalari"
      >
        <Bell className="h-4 w-4" strokeWidth={2.25} />
        {count > 0 && <span className="login-approvals-badge">{count}</span>}
      </button>

      {/* Asosiy: tugmalar to'g'ridan-to'g'ri bannerda */}
      {count > 0 && latest && (
        <div className="login-approvals-banner" role="alertdialog" aria-label="Kirish so'rovi">
          <div className="login-approvals-banner-top">
            <MonitorSmartphone className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="login-approvals-banner-title">Kirish so&apos;rovi</p>
              <p className="login-approvals-banner-device">{latest.deviceLabel}</p>
              {count > 1 && (
                <p className="login-approvals-banner-more">+{count - 1} ta boshqa so&apos;rov</p>
              )}
            </div>
            <button
              type="button"
              className="login-approvals-banner-close"
              onClick={() => setOpen(false)}
              aria-label="Yopish"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="login-approvals-banner-actions">
            <button
              type="button"
              disabled={busyId === latest.id}
              onClick={() => void act(latest.id, "approve")}
              className="is-approve"
            >
              <Check className="h-4 w-4" />
              Tasdiqlash
            </button>
            <button
              type="button"
              disabled={busyId === latest.id}
              onClick={() => void act(latest.id, "reject")}
              className="is-reject"
            >
              <X className="h-4 w-4" />
              Rad etish
            </button>
          </div>
          {count > 1 && (
            <button
              type="button"
              className="login-approvals-banner-all"
              onClick={() => setOpen(true)}
            >
              Barcha so&apos;rovlarni ko&apos;rish
            </button>
          )}
        </div>
      )}

      {open && count > 1 && (
        <>
          <button
            type="button"
            className="login-approvals-backdrop"
            aria-label="Yopish"
            onClick={() => setOpen(false)}
          />
          <div className="login-approvals-panel" role="dialog" aria-label="Kirish so'rovlari">
            <div className="login-approvals-head">
              <div>
                <h3>
                  <Shield className="h-4 w-4" />
                  Barcha kirish so&apos;rovlari
                </h3>
                <p>{count} ta kutilmoqda</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Yopish">
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="login-approvals-list">
              {requests.map((r) => (
                <li key={r.id}>
                  <div className="login-approvals-item-info">
                    <MonitorSmartphone className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="login-approvals-device">{r.deviceLabel}</p>
                      <p className="login-approvals-meta">
                        {new Date(r.createdAt).toLocaleString("uz-UZ", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "short",
                        })}
                        {r.ipAddress ? ` · ${r.ipAddress}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="login-approvals-actions">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void act(r.id, "approve")}
                      className="is-approve"
                    >
                      <Check className="h-4 w-4" />
                      Tasdiqlash
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => void act(r.id, "reject")}
                      className="is-reject"
                    >
                      <X className="h-4 w-4" />
                      Rad etish
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

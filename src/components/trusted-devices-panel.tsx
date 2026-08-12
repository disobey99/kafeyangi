"use client";

import { useCallback, useEffect, useState } from "react";
import { LogOut, MonitorSmartphone, Smartphone, Trash2 } from "lucide-react";
import { getClientDeviceLabel, getOrCreateDeviceId } from "@/lib/device-client";

type Device = {
  id: string;
  deviceId: string;
  deviceLabel: string;
  lastSeenAt: string;
  createdAt: string;
};

export function TrustedDevicesPanel({ variant = "default" }: { variant?: "default" | "cashier" }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [currentId, setCurrentId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Joriy qurilmani ro'yxatga qo'shish
      const deviceId = getOrCreateDeviceId();
      setCurrentId(deviceId);
      await fetch("/api/auth/trust-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          deviceLabel: getClientDeviceLabel(),
        }),
      });

      const res = await fetch("/api/auth/trusted-devices");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Yuklanmadi");
        return;
      }
      setDevices(data.devices ?? []);
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function revokeOne(rowId: string, deviceId: string) {
    if (deviceId === currentId) {
      if (!confirm("Bu joriy qurilma. Chiqarib yuborsangiz, keyingi kirishda tasdiq kerak bo'ladi. Davom etasizmi?")) {
        return;
      }
    } else if (!confirm("Bu qurilmani chiqarib yuborasizmi?")) {
      return;
    }

    setBusy(rowId);
    setError("");
    try {
      const res = await fetch("/api/auth/trusted-devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: rowId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik");
        return;
      }
      await load();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setBusy(null);
    }
  }

  async function revokeAllOthers() {
    if (!confirm("Boshqa barcha qurilmalarni chiqarib yuborasizmi? Ular qayta kirishda tasdiq so'raydi.")) {
      return;
    }
    setBusy("all");
    setError("");
    try {
      const res = await fetch("/api/auth/trusted-devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          all: true,
          keepCurrent: true,
          currentDeviceId: getOrCreateDeviceId(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik");
        return;
      }
      await load();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setBusy(null);
    }
  }

  const blockClass =
    variant === "cashier" ? "cashier-account-block" : "trusted-devices-block";

  return (
    <div className={blockClass}>
      <h3>
        <Smartphone className="h-4 w-4" />
        Faol qurilmalar
      </h3>
      <p>Hisobingizga kirgan telefon va kompyuterlar</p>

      {error && <p className="trusted-devices-error">{error}</p>}

      {loading ? (
        <p className="trusted-devices-muted">Yuklanmoqda...</p>
      ) : devices.length === 0 ? (
        <p className="trusted-devices-muted">Qurilmalar yo&apos;q</p>
      ) : (
        <ul className="trusted-devices-list">
          {devices.map((d) => {
            const isCurrent = d.deviceId === currentId;
            return (
              <li key={d.id} className={isCurrent ? "is-current" : ""}>
                <div className="trusted-devices-item-info">
                  <MonitorSmartphone className="h-5 w-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="trusted-devices-label">
                      {d.deviceLabel}
                      {isCurrent && <span className="trusted-devices-badge">Shu qurilma</span>}
                    </p>
                    <p className="trusted-devices-meta">
                      Oxirgi:{" "}
                      {new Date(d.lastSeenAt).toLocaleString("uz-UZ", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy === d.id}
                  onClick={() => void revokeOne(d.id, d.deviceId)}
                  className="trusted-devices-revoke"
                  title="Chiqarib yuborish"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Chiqarish</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {devices.some((d) => d.deviceId !== currentId) && (
        <button
          type="button"
          disabled={busy === "all"}
          onClick={() => void revokeAllOthers()}
          className={variant === "cashier" ? "cashier-account-danger" : "trusted-devices-revoke-all"}
        >
          <LogOut className="h-4 w-4" />
          {busy === "all" ? "Chiqarilmoqda..." : "Boshqa barchasini chiqarib yuborish"}
        </button>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  Circle,
  Lock,
  Shield,
  Timer,
  User,
  X,
  ArrowLeftRight,
} from "lucide-react";
import { TrustedDevicesPanel } from "@/components/trusted-devices-panel";
import { ShiftSwapPanel } from "@/components/shift-swap-panel";
import { StaffBiometricSettings } from "@/components/staff-biometric-settings";

type Profile = {
  name: string;
  phone: string;
  avatarUrl: string;
};

export function StaffAccountPanel({
  cafeId,
  roleLabel,
  userId,
  onClose,
  onProfileSaved,
}: {
  cafeId: string;
  roleLabel: string;
  userId?: string;
  onClose: () => void;
  onProfileSaved?: (profile: { name: string; avatarUrl: string | null }) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"profile" | "security" | "swap">("profile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [lockTimeout, setLockTimeout] = useState("300000");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    avatarUrl: "",
  });
  const [pinForm, setPinForm] = useState({
    pin: "",
    confirmPin: "",
    currentPin: "",
  });

  useEffect(() => {
    const stored = localStorage.getItem("staff_pin_timeout_ms");
    if (stored) setLockTimeout(stored);

    fetch(`/api/cafes/${cafeId}/waiter/profile`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.profile) {
          setForm({
            name: data.profile.name || "",
            phone: data.profile.phone || "",
            password: "",
            avatarUrl: data.profile.avatarUrl || "",
          });
        }
      });

    fetch(`/api/cafes/${cafeId}/staff/pin`)
      .then((r) => r.json())
      .then((d) => {
        setHasPin(Boolean(d.hasPin));
        setUnlocked(Boolean(d.unlocked));
      })
      .catch(() => {});
  }, [cafeId]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/cafes/${cafeId}/waiter/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Saqlashda xatolik");
        return;
      }
      setSuccess("Profil saqlandi");
      setForm((f) => ({ ...f, password: "" }));
      onProfileSaved?.({
        name: data.profile.name,
        avatarUrl: data.profile.avatarUrl,
      });
      router.refresh();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(file: File) {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const { uploadCafeImage } = await import("@/lib/upload-client");
      const result = await uploadCafeImage(cafeId, file, form.avatarUrl);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const nextUrl = result.url;
      setForm((f) => ({ ...f, avatarUrl: nextUrl }));

      // Yuklangach darhol DB ga saqlash (yopib ketilsa yo'qolmasin)
      const res = await fetch(`/api/cafes/${cafeId}/waiter/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: nextUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Rasm yuklandi, lekin saqlanmadi. «Profilni saqlash» ni bosing.",
        );
        return;
      }
      setSuccess("Profil rasmi saqlandi");
      onProfileSaved?.({
        name: form.name,
        avatarUrl: nextUrl,
      });
      router.refresh();
    } catch {
      setError("Rasm yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }

  async function savePin() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/cafes/${cafeId}/staff/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setup",
          pin: pinForm.pin,
          confirmPin: pinForm.confirmPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Parol saqlanmadi");
        return;
      }
      setHasPin(true);
      setUnlocked(true);
      setPinForm({ pin: "", confirmPin: "", currentPin: "" });
      setSuccess(hasPin ? "Kirish paroli yangilandi" : "Kirish paroli o'rnatildi");
      window.dispatchEvent(new CustomEvent("kafe:staff-pin-unlocked"));
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  async function removePin() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/cafes/${cafeId}/staff/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          pin: pinForm.currentPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Parol olib tashlanmadi");
        return;
      }
      setHasPin(false);
      setUnlocked(false);
      setPinForm({ pin: "", confirmPin: "", currentPin: "" });
      setSuccess("Kirish paroli olib tashlandi");
      window.dispatchEvent(new CustomEvent("kafe:staff-pin-locked"));
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  const initial = (form.name || "K").slice(0, 1).toUpperCase();

  return (
    <div className="cashier-account-panel" role="dialog" aria-modal="true">
      <div className="cashier-account-panel-head">
        <div>
          <h2>Sozlamalar</h2>
          <p>Profil, xavfsizlik va status</p>
        </div>
        <button type="button" onClick={onClose} className="cashier-pos-icon-btn" aria-label="Yopish">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="cashier-account-status">
        <div className="cashier-account-status-avatar">
          {form.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.avatarUrl} alt="" />
          ) : (
            <span>{initial}</span>
          )}
          <i className={unlocked || !hasPin ? "is-online" : "is-locked"} />
        </div>
        <div>
          <p className="cashier-account-status-name">{form.name || "Xodim"}</p>
          <p className="cashier-account-status-role">{roleLabel}</p>
          <p className="cashier-account-status-badge">
            {hasPin ? (
              unlocked ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Onlayn · ochiq
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" /> Qulflangan
                </>
              )
            ) : (
              <>
                <Circle className="h-3.5 w-3.5" /> Onlayn · parolsiz
              </>
            )}
          </p>
        </div>
      </div>

      <div className="cashier-account-tabs">
        <button
          type="button"
          className={tab === "profile" ? "is-active" : ""}
          onClick={() => setTab("profile")}
        >
          <User className="h-4 w-4" />
          Profil
        </button>
        <button
          type="button"
          className={tab === "swap" ? "is-active" : ""}
          onClick={() => setTab("swap")}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Smena
        </button>
        <button
          type="button"
          className={tab === "security" ? "is-active" : ""}
          onClick={() => setTab("security")}
        >
          <Shield className="h-4 w-4" />
          Xavfsizlik
        </button>
      </div>

      {error && <p className="cashier-account-error">{error}</p>}
      {success && <p className="cashier-account-success">{success}</p>}

      {tab === "swap" ? (
        <div className="cashier-account-form">
          <ShiftSwapPanel cafeId={cafeId} userId={userId} compact />
        </div>
      ) : tab === "profile" ? (
        <form onSubmit={saveProfile} className="cashier-account-form">
          <label>
            Ism
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ismingiz"
            />
          </label>
          <label>
            Telefon
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+998901234567"
            />
          </label>
          <label>
            Login paroli (ixtiyoriy)
            <input
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="O'zgartirish uchun yangi parol"
            />
          </label>
          <div className="cashier-account-avatar-field">
            <span>Profil rasmi</span>
            <div className="cashier-account-avatar-row">
              <input
                id="cashier-avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadAvatar(file);
                }}
              />
              <label htmlFor="cashier-avatar-upload" className="cashier-account-upload-btn">
                <Camera className="h-4 w-4" />
                Yuklash
              </label>
              <input
                value={form.avatarUrl}
                onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                placeholder="Yoki rasm URL"
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="cashier-account-primary">
            {loading ? "Saqlanmoqda..." : "Profilni saqlash"}
          </button>
        </form>
      ) : (
        <div className="cashier-account-form">
          <div className="cashier-account-block">
            <h3>
              <Lock className="h-4 w-4" />
              Ekran kirish paroli (PIN)
            </h3>
            <p>6 xonali raqam — ekranni qulflash va ochish uchun</p>
            <label>
              {hasPin ? "Yangi PIN" : "PIN o'rnatish"}
              <input
                inputMode="numeric"
                maxLength={6}
                value={pinForm.pin}
                onChange={(e) =>
                  setPinForm({ ...pinForm, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })
                }
                placeholder="••••••"
              />
            </label>
            <label>
              PIN tasdiq
              <input
                inputMode="numeric"
                maxLength={6}
                value={pinForm.confirmPin}
                onChange={(e) =>
                  setPinForm({
                    ...pinForm,
                    confirmPin: e.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
                placeholder="••••••"
              />
            </label>
            <button
              type="button"
              disabled={loading || pinForm.pin.length !== 6}
              onClick={() => void savePin()}
              className="cashier-account-primary"
            >
              {hasPin ? "PINni yangilash" : "PINni o'rnatish"}
            </button>
          </div>

          {hasPin && (
            <div className="cashier-account-block">
              <h3>PINni olib tashlash</h3>
              <p>Joriy PIN ni kiriting — ekran qulfi o&apos;chadi</p>
              <label>
                Joriy PIN
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={pinForm.currentPin}
                  onChange={(e) =>
                    setPinForm({
                      ...pinForm,
                      currentPin: e.target.value.replace(/\D/g, "").slice(0, 6),
                    })
                  }
                  placeholder="••••••"
                />
              </label>
              <button
                type="button"
                disabled={loading || pinForm.currentPin.length !== 6}
                onClick={() => void removePin()}
                className="cashier-account-danger"
              >
                Parolni olib tashlash
              </button>
            </div>
          )}

          <div className="cashier-account-block">
            <h3>
              <Timer className="h-4 w-4" />
              Avtomatik qulflash vaqti
            </h3>
            <p>Harakatsizlikdan keyin ekran qulflanadi</p>
            <select
              value={lockTimeout}
              onChange={(e) => {
                const val = e.target.value;
                setLockTimeout(val);
                localStorage.setItem("staff_pin_timeout_ms", val);
                setSuccess("Vaqt saqlandi");
              }}
            >
              <option value="0">Hech qachon</option>
              <option value="60000">1 daqiqa</option>
              <option value="180000">3 daqiqa</option>
              <option value="300000">5 daqiqa</option>
              <option value="600000">10 daqiqa</option>
            </select>
          </div>

          <StaffBiometricSettings cafeId={cafeId} />

          <TrustedDevicesPanel variant="cashier" />
        </div>
      )}
    </div>
  );
}

export type { Profile };

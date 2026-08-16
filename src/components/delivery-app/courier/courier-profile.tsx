"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Bike,
  Coffee,
  Fingerprint,
  KeyRound,
  Lock,
  LogOut,
  MapPin,
  Monitor,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { StaffBiometricSettings } from "@/components/staff-biometric-settings";
import { useTheme } from "@/components/theme-provider";
import type { Theme } from "@/lib/theme";
import { isStaffBiometricAvailable } from "@/lib/staff-webauthn-client";
import {
  isPushEnabledLocally,
  isPushSupported,
  subscribeCafePush,
  syncExistingPushSubscription,
} from "@/lib/push-client";
import type { MenuLocale } from "@/lib/menu-i18n";
import { getDeliveryUiLabels } from "@/lib/delivery-ui-labels";

type GpsUi = "off" | "ok" | "asking" | "denied" | "insecure" | "err";

export function CourierProfileScreen({
  cafeId,
  primaryColor,
  user,
  gpsStatus,
  usingCafeFallback,
  cafeGeo,
  onDuty = false,
  onDutyChange,
  onRequestGps,
  onUseCafeFallback,
  onLogout,
  onProfileSaved,
  locale = "uz",
}: {
  cafeId: string;
  primaryColor: string;
  user: { id: string; name: string; email: string };
  gpsStatus: GpsUi;
  usingCafeFallback: boolean;
  cafeGeo: { lat: number; lng: number } | null;
  onDuty?: boolean;
  onDutyChange?: (onDuty: boolean) => void;
  onRequestGps: () => Promise<void> | void;
  onUseCafeFallback: () => void;
  onLogout: () => void;
  onProfileSaved?: (name: string) => void;
  locale?: MenuLocale;
}) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const ui = getDeliveryUiLabels(locale);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => setThemeMounted(true), []);

  const load = useCallback(async () => {
    try {
      const [profRes, pinRes] = await Promise.all([
        fetch(`/api/cafes/${cafeId}/waiter/profile`),
        fetch(`/api/cafes/${cafeId}/staff/pin`),
      ]);
      if (profRes.ok) {
        const d = await profRes.json();
        if (d.profile) {
          setName(d.profile.name || user.name);
          setPhone(d.profile.phone || "");
        }
      }
      if (pinRes.ok) {
        const d = await pinRes.json();
        setHasPin(Boolean(d.hasPin));
      }
    } catch {
      /* ignore */
    }

    if (isPushSupported() && Notification.permission === "granted") {
      const ok =
        isPushEnabledLocally() &&
        (await syncExistingPushSubscription(cafeId));
      setPushOn(ok);
    }
  }, [cafeId, user.name]);

  useEffect(() => {
    void load();
    void isStaffBiometricAvailable().then(setBioSupported);
  }, [load]);

  async function saveProfile() {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`/api/cafes/${cafeId}/waiter/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          password: password || undefined,
          avatarUrl: "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || (locale === "ru" ? "Не сохранено" : locale === "en" ? "Not saved" : "Saqlanmadi"));
        return;
      }
      setPassword("");
      setMsg(locale === "ru" ? "Данные сохранены" : locale === "en" ? "Data saved" : "Ma'lumot saqlandi");
      onProfileSaved?.(data.profile?.name || name);
    } catch {
      setErr(locale === "ru" ? "Ошибка соединения" : locale === "en" ? "Connection error" : "Ulanish xatosi");
    } finally {
      setBusy(false);
    }
  }

  async function savePin() {
    if (pin.length !== 6 || pin !== confirmPin) {
      setErr(locale === "ru" ? "PIN должен состоять из 6 цифр и совпадать" : locale === "en" ? "PIN must be 6 digits and match" : "PIN 6 xona va bir xil bo'lishi kerak");
      return;
    }
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`/api/cafes/${cafeId}/staff/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup", pin, confirmPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || (locale === "ru" ? "PIN не сохранен" : locale === "en" ? "PIN not saved" : "PIN saqlanmadi"));
        return;
      }
      setHasPin(true);
      setPin("");
      setConfirmPin("");
      setMsg(hasPin 
        ? (locale === "ru" ? "PIN обновлен" : locale === "en" ? "PIN updated" : "PIN yangilandi") 
        : (locale === "ru" ? "PIN установлен" : locale === "en" ? "PIN setup" : "PIN o'rnatildi")
      );
      window.dispatchEvent(new CustomEvent("kafe:staff-pin-unlocked"));
    } catch {
      setErr(locale === "ru" ? "Ошибка соединения" : locale === "en" ? "Connection error" : "Ulanish xatosi");
    } finally {
      setBusy(false);
    }
  }

  async function enablePush() {
    setPushBusy(true);
    setErr("");
    try {
      if (!isPushSupported()) {
        setErr(locale === "ru" ? "Этот браузер не поддерживает push-уведомления" : locale === "en" ? "This browser does not support push notifications" : "Bu brauzer push ni qo'llab-quvvatlamaydi");
        return;
      }
      if (Notification.permission === "denied") {
        setErr(locale === "ru" ? "Уведомления заблокированы — включите в настройках телефона" : locale === "en" ? "Notifications are blocked — enable in phone settings" : "Bildirishnoma bloklangan — telefon sozlamasidan yoqing");
        return;
      }
      const ok = await subscribeCafePush(cafeId);
      if (!ok) {
        setErr(locale === "ru" ? "Уведомления не включены" : locale === "en" ? "Notifications not enabled" : "Bildirishnoma yoqilmadi");
        return;
      }
      setPushOn(true);
      setMsg(locale === "ru" ? "Уведомления включены" : locale === "en" ? "Notifications enabled" : "Bildirishnoma yoqildi");
    } finally {
      setPushBusy(false);
    }
  }

  const gpsLabel =
    gpsStatus === "ok" && !usingCafeFallback
      ? (locale === "ru" ? "Включено" : locale === "en" ? "Enabled" : "Yoqilgan")
      : usingCafeFallback
        ? (locale === "ru" ? "Из кафе (приблизительно)" : locale === "en" ? "From cafe (estimated)" : "Kafedan (taxminiy)")
        : gpsStatus === "asking"
          ? (locale === "ru" ? "Запрос…" : locale === "en" ? "Requesting…" : "So'rov…")
          : gpsStatus === "insecure"
            ? (locale === "ru" ? "Требуется HTTPS (после деплоя)" : locale === "en" ? "HTTPS required (after deploy)" : "HTTPS kerak (deploy dan keyin)")
            : gpsStatus === "denied"
              ? (locale === "ru" ? "Заблокировано" : locale === "en" ? "Blocked" : "Bloklangan")
              : (locale === "ru" ? "Выключено" : locale === "en" ? "Off" : "O'chiq");

  const themeOptions: Array<{ id: Theme; label: string; icon: typeof Sun }> = [
    { id: "light", label: ui.themeLight, icon: Sun },
    { id: "dark", label: ui.themeDark, icon: Moon },
    { id: "system", label: ui.themeSystem, icon: Monitor },
  ];

  return (
    <div className="space-y-4 px-4 py-5">
      <h2 className="text-lg font-extrabold" style={{ color: "var(--da-ink)" }}>
        {ui.profileTab}
      </h2>

      <section className="space-y-2">
        <h3
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--da-muted)" }}
        >
          {ui.appearanceTitle}
        </h3>
        <div className="flex gap-2">
          {themeOptions.map(({ id, label, icon: Icon }) => {
            const active = themeMounted ? theme === id : id === "system";
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-bold"
                style={
                  active
                    ? { background: primaryColor, color: "#fff" }
                    : {
                        background: "var(--da-input)",
                        color: "var(--da-ink)",
                      }
                }
                title={
                  id === "system" && themeMounted && resolvedTheme
                    ? `${label} (${resolvedTheme === "dark" ? ui.themeDark : ui.themeLight})`
                    : label
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {msg ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-500/15 dark:text-red-300">
          {err}
        </p>
      ) : null}

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm font-extrabold text-stone-900">
          {locale === "ru" ? "Статус работы" : locale === "en" ? "Duty status" : "Ish statusi"}
        </p>
        <p className="text-xs text-stone-500">
          {locale === "ru" ? "Сейчас" : locale === "en" ? "Now" : "Hozir"}:{" "}
          <span className="font-bold text-stone-800">
            {onDuty 
              ? (locale === "ru" ? "На работе" : locale === "en" ? "On duty" : "Ishda") 
              : (locale === "ru" ? "Не на работе" : locale === "en" ? "Off duty" : "Ishda emas")
            }
          </span>
          {locale === "ru" 
            ? ". Смена статуса — повторный вход не требуется." 
            : locale === "en" 
            ? ". Status switch — no re-login needed." 
            : ". Statusni almashtirish — qayta login shart emas."
          }
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={onDuty}
            onClick={() => onDutyChange?.(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-extrabold text-white disabled:opacity-50"
            style={{ background: primaryColor }}
          >
            <Bike className="h-4 w-4" />
            {locale === "ru" ? "На работе" : locale === "en" ? "On duty" : "Ishda"}
          </button>
          <button
            type="button"
            disabled={!onDuty}
            onClick={() => onDutyChange?.(false)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 py-3 text-xs font-extrabold text-stone-700 disabled:opacity-50"
          >
            <Coffee className="h-4 w-4" />
            {locale === "ru" ? "Не на работе" : locale === "en" ? "Off duty" : "Ishda emas"}
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-extrabold text-stone-900">
          <User className="h-4 w-4" style={{ color: primaryColor }} />
          {locale === "ru" ? "Изменить данные" : locale === "en" ? "Edit info" : "Ma'lumotni o'zgartirish"}
        </p>
        <p className="text-xs text-stone-400">{user.email}</p>
        <label className="block text-xs font-bold text-stone-500">
          {locale === "ru" ? "Имя" : locale === "en" ? "Name" : "Ism"}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-semibold text-stone-900 outline-none focus:border-stone-400"
          />
        </label>
        <label className="block text-xs font-bold text-stone-500">
          {locale === "ru" ? "Телефон" : locale === "en" ? "Phone" : "Telefon"}
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998…"
            className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-semibold text-stone-900 outline-none focus:border-stone-400"
          />
        </label>
        <label className="block text-xs font-bold text-stone-500">
          {locale === "ru" ? "Пароль для входа (необязательно)" : locale === "en" ? "Login password (optional)" : "Login paroli (ixtiyoriy)"}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={locale === "ru" ? "Новый пароль для изменения" : locale === "en" ? "New password to change" : "O'zgartirish uchun yangi parol"}
            minLength={6}
            className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-semibold text-stone-900 outline-none focus:border-stone-400"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveProfile()}
          className="w-full rounded-xl py-3 text-sm font-extrabold text-white disabled:opacity-60"
          style={{ background: primaryColor }}
        >
          {busy ? "…" : (locale === "ru" ? "Сохранить" : locale === "en" ? "Save" : "Saqlash")}
        </button>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-extrabold text-stone-900">
          <Lock className="h-4 w-4" style={{ color: primaryColor }} />
          {locale === "ru" ? "Пароль экрана (PIN)" : locale === "en" ? "Screen password (PIN)" : "Ekran paroli (PIN)"}
        </p>
        <p className="text-xs text-stone-500">
          {hasPin
            ? (locale === "ru" ? "PIN установлен — введите новый код для обновления" : locale === "en" ? "PIN is set — enter new code to update" : "PIN o'rnatilgan — yangilash uchun yangi kod kiriting")
            : (locale === "ru" ? "6-значный PIN — для разблокировки при блокировке приложения" : locale === "en" ? "6-digit PIN — to unlock when app is locked" : "6 xonali PIN — ilova qulflanganda ochish uchun")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <input
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder={locale === "ru" ? "Новый ПИН" : locale === "en" ? "New PIN" : "Yangi PIN"}
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-semibold outline-none"
          />
          <input
            inputMode="numeric"
            maxLength={6}
            value={confirmPin}
            onChange={(e) =>
              setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder={locale === "ru" ? "Подтверждение" : locale === "en" ? "Confirm" : "Tasdiq"}
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-semibold outline-none"
          />
        </div>
        <button
          type="button"
          disabled={busy || pin.length !== 6}
          onClick={() => void savePin()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 py-3 text-sm font-extrabold text-stone-800 disabled:opacity-50"
        >
          <KeyRound className="h-4 w-4" />
          {hasPin 
            ? (locale === "ru" ? "Обновить ПИН" : locale === "en" ? "Update PIN" : "PINni yangilash") 
            : (locale === "ru" ? "Установить ПИН" : locale === "en" ? "Set PIN" : "PIN o'rnatish")
          }
        </button>
      </section>

      <StaffBiometricSettings cafeId={cafeId} />

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-extrabold text-stone-900">
          <MapPin className="h-4 w-4" style={{ color: primaryColor }} />
          {locale === "ru" ? "Геопозиция (GPS)" : locale === "en" ? "Location (GPS)" : "Joylashuv (GPS)"}
        </p>
        <p className="text-xs text-stone-500">
          {locale === "ru" ? "Состояние" : locale === "en" ? "Status" : "Holat"}: <span className="font-bold text-stone-800">{gpsLabel}</span>
        </p>
        <p className="text-[11px] leading-relaxed text-stone-400">
          {locale === "ru" 
            ? "Будет полностью работать после размещения сайта в интернете." 
            : locale === "en" 
            ? "Will fully work after deploying the site on the internet." 
            : "Sayt internetga joylangach to'liq ishlaydi."
          }
        </p>
        <button
          type="button"
          disabled={gpsStatus === "asking"}
          onClick={() => void onRequestGps()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold text-white disabled:opacity-60"
          style={{ background: primaryColor }}
        >
          <MapPin className="h-4 w-4" />
          {gpsStatus === "asking" ? "…" : (locale === "ru" ? "Включить GPS" : locale === "en" ? "Enable GPS" : "GPS yoqish")}
        </button>
        {cafeGeo && gpsStatus !== "ok" ? (
          <button
            type="button"
            onClick={onUseCafeFallback}
            className="w-full rounded-xl border border-stone-200 py-2.5 text-xs font-bold text-stone-600"
          >
            {locale === "ru" ? "Временно рассчитывать из кафе" : locale === "en" ? "Temporarily calculate from cafe" : "Vaqtincha kafedan hisoblash"}
          </button>
        ) : null}
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-extrabold text-stone-900">
          <Bell className="h-4 w-4" style={{ color: primaryColor }} />
          {locale === "ru" ? "Уведомления" : locale === "en" ? "Notifications" : "Bildirishnoma"}
        </p>
        <p className="text-xs text-stone-500">
          {pushOn
            ? (locale === "ru" ? "Включено — уведомления приходят даже при закрытом приложении" : locale === "en" ? "Enabled — notifications arrive even when app is closed" : "Yoqilgan — ilovadan chiqqanda ham xabar keladi")
            : (locale === "ru" ? "Всплывающие уведомления о новых заказах" : locale === "en" ? "Pop-up notifications for new orders" : "Yangi buyurtma uchun qalqib chiquvchi xabar")}
        </p>
        <button
          type="button"
          disabled={pushBusy || pushOn}
          onClick={() => void enablePush()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 py-3 text-sm font-extrabold text-stone-800 disabled:opacity-60"
        >
          <Bell className="h-4 w-4" />
          {pushOn 
            ? (locale === "ru" ? "Включено" : locale === "en" ? "Enabled" : "Yoqilgan") 
            : pushBusy 
            ? "…" 
            : (locale === "ru" ? "Включить уведомления" : locale === "en" ? "Enable notifications" : "Bildirishnomani yoqish")
          }
        </button>
      </section>

      <button
        type="button"
        onClick={onLogout}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 py-3.5 text-sm font-extrabold text-white"
      >
        <LogOut className="h-4 w-4" />
        {locale === "ru" ? "Выйти" : locale === "en" ? "Logout" : "Chiqish"}
      </button>
    </div>
  );
}

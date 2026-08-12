"use client";

import { useState } from "react";
import {
  Bike,
  UserRound,
  Phone,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import type { DeliveryProfile } from "./types";
import { BAEMIN_TEAL } from "./theme";
import type { MenuLocale } from "@/lib/menu-i18n";
import { getDeliveryUiLabels } from "@/lib/delivery-ui-labels";

export function DeliveryLoginScreen({
  cafeId,
  cafeName,
  logoUrl,
  primaryColor = BAEMIN_TEAL,
  loyaltyEnabled = false,
  locale,
  onLocaleChange,
  onCustomerSuccess,
  onCourierSuccess,
}: {
  cafeId: string;
  cafeName: string;
  logoUrl?: string | null;
  primaryColor?: string;
  loyaltyEnabled?: boolean;
  locale: MenuLocale;
  onLocaleChange: (locale: MenuLocale) => void;
  onCustomerSuccess: (profile: DeliveryProfile) => void;
  onCourierSuccess: (user: { id: string; name: string; email: string }) => void;
}) {
  const [activeTab, setActiveTab] = useState<"customer" | "courier">("customer");
  const ui = getDeliveryUiLabels(locale);
  const [customerMode, setCustomerMode] = useState<"login" | "register">("login");

  const [phone, setPhone] = useState("+998");
  const [name, setName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [customerPassword2, setCustomerPassword2] = useState("");
  const [showCustomerPassword, setShowCustomerPassword] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [courierError, setCourierError] = useState("");
  const [courierLoading, setCourierLoading] = useState(false);

  const handlePhoneChange = (val: string) => {
    setCustomerError("");
    if (!val || val === "+") {
      setPhone("+");
      return;
    }
    let cleaned = val;
    if (!cleaned.startsWith("+")) {
      cleaned = "+" + cleaned.replace(/\D/g, "");
    } else {
      cleaned = "+" + cleaned.slice(1).replace(/\D/g, "");
    }
    if (cleaned.length <= 16) setPhone(cleaned);
  };

  async function handleCustomerLogin(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      setCustomerError(ui.phoneError);
      return;
    }
    if (!customerPassword) {
      setCustomerError(ui.passwordRequired);
      return;
    }
    setCustomerError("");
    setCustomerLoading(true);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/app-customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          phone,
          password: customerPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) {
        setCustomerError(data.error || ui.customerLoginError);
        return;
      }
      onCustomerSuccess({
        name: String(data.profile.name ?? "").trim(),
        phone: String(data.profile.phone ?? phone).trim(),
        address: String(data.profile.address ?? "").trim(),
        email: data.profile.email || undefined,
        lat: data.profile.lat ?? null,
        lng: data.profile.lng ?? null,
      });
    } catch {
      setCustomerError(ui.networkError);
    } finally {
      setCustomerLoading(false);
    }
  }

  async function handleCustomerRegister(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = customerEmail.trim().toLowerCase();
    const digits = phone.replace(/\D/g, "");

    if (!cleanName) {
      setCustomerError(ui.nameRequired);
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setCustomerError(ui.emailRequired);
      return;
    }
    if (digits.length < 7 || digits.length > 15) {
      setCustomerError(ui.phoneError);
      return;
    }
    if (customerPassword.length < 6) {
      setCustomerError(ui.passwordMin);
      return;
    }
    if (customerPassword !== customerPassword2) {
      setCustomerError(ui.passwordMismatch);
      return;
    }

    setCustomerError("");
    setCustomerLoading(true);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/app-customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          name: cleanName,
          email: cleanEmail,
          phone,
          password: customerPassword,
          address: "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) {
        setCustomerError(data.error || ui.registerFailed);
        return;
      }
      if (loyaltyEnabled) {
        void fetch(`/api/cafes/${cafeId}/loyalty/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        }).catch(() => undefined);
      }
      onCustomerSuccess({
        name: String(data.profile.name ?? cleanName).trim(),
        phone: String(data.profile.phone ?? phone).trim(),
        address: String(data.profile.address ?? "").trim(),
        email: data.profile.email || cleanEmail,
        lat: data.profile.lat ?? null,
        lng: data.profile.lng ?? null,
      });
    } catch {
      setCustomerError(ui.networkError);
    } finally {
      setCustomerLoading(false);
    }
  }

  async function handleCourierSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCourierError("");
    setCourierLoading(true);
    try {
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        setCourierError(loginData.error || ui.courierError);
        setCourierLoading(false);
        return;
      }

      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      const membership = (meData.user?.memberships ?? []).find(
        (m: { cafe: { id: string }; role: string }) =>
          m.cafe.id === cafeId && m.role === "COURIER",
      );
      if (!membership || !meData.user) {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        setCourierError(ui.courierNotForCafe);
        setCourierLoading(false);
        return;
      }
      onCourierSuccess({
        id: meData.user.id,
        name: meData.user.name,
        email: meData.user.email,
      });
    } catch {
      setCourierError(ui.networkError);
      setCourierLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col justify-between overflow-hidden px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-12 overscroll-none">
      <div
        className="pointer-events-none absolute -left-20 -top-10 h-64 w-64 rounded-full opacity-30 blur-3xl"
        style={{ background: primaryColor }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 top-1/3 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl"
        aria-hidden
      />

      <div className="absolute right-4 top-4 z-[10] flex gap-1 rounded-full bg-white/80 p-0.5 shadow-sm border border-stone-100 backdrop-blur-sm">
        {(
          [
            ["uz", "UZ"],
            ["ru", "RU"],
            ["en", "EN"],
          ] as const
        ).map(([code, label]) => (
          <button
            key={code}
            type="button"
            onClick={() => onLocaleChange(code)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold transition-all duration-200 ${
              locale === code
                ? "text-white shadow-sm"
                : "text-stone-500 hover:text-stone-800"
            }`}
            style={locale === code ? { background: primaryColor } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative z-[1] mx-auto w-full max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.08)] border border-stone-100 p-1">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-full w-full rounded-[24px] object-cover" />
          ) : (
            <span
              className="grid h-full w-full place-items-center rounded-[24px] text-2xl font-black text-white"
              style={{ background: primaryColor }}
            >
              {cafeName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <h1 className="mt-4 text-[24px] font-black tracking-tight text-stone-900">{cafeName}</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-stone-400">
          {ui.onlineOrderingSystem}
        </p>
      </div>

      <div className="relative z-[1] mx-auto mt-8 w-full max-w-md flex-1 flex flex-col justify-center">
        <div className="rounded-[32px] bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-stone-200/60">
          <div className="flex rounded-2xl bg-stone-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("customer");
                setCustomerError("");
                setCourierError("");
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition-all duration-200 ${
                activeTab === "customer"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <UserRound className="h-4 w-4" />
              {ui.customerTab}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("courier");
                setCustomerError("");
                setCourierError("");
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition-all duration-200 ${
                activeTab === "courier"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <Bike className="h-4 w-4" />
              {ui.courierTab}
            </button>
          </div>

          {activeTab === "customer" && customerMode === "login" && (
            <form onSubmit={(e) => void handleCustomerLogin(e)} className="space-y-4">
              <div>
                <h2 className="text-lg font-black text-stone-900">{ui.welcomeTitle}</h2>
                <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                  {ui.customerLoginSub}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {ui.phoneLabel}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="+998901234567"
                  className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50/50 px-4 py-3.5 text-sm font-extrabold text-stone-800 outline-none transition focus:border-teal-400 focus:bg-white"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> {ui.passwordLabel}
                </label>
                <div className="relative">
                  <input
                    type={showCustomerPassword ? "text" : "password"}
                    value={customerPassword}
                    onChange={(e) => {
                      setCustomerError("");
                      setCustomerPassword(e.target.value);
                    }}
                    autoComplete="current-password"
                    className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50/50 px-4 py-3.5 pr-12 text-sm font-bold text-stone-800 outline-none transition focus:border-teal-400 focus:bg-white"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                    onClick={() => setShowCustomerPassword((v) => !v)}
                  >
                    {showCustomerPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {customerError && (
                <p className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                  {customerError}
                </p>
              )}

              <button
                type="submit"
                disabled={customerLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
                style={{ background: primaryColor }}
              >
                {customerLoading ? ui.loading : ui.loginBtn}
                {!customerLoading && <ArrowRight className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCustomerMode("register");
                  setCustomerError("");
                }}
                className="w-full py-2 text-xs font-bold text-stone-500 hover:text-stone-800"
              >
                {ui.noAccountRegister}
              </button>
            </form>
          )}

          {activeTab === "customer" && customerMode === "register" && (
            <form onSubmit={(e) => void handleCustomerRegister(e)} className="space-y-3.5">
              <div>
                <h2 className="text-lg font-black text-stone-900">{ui.registerTitle}</h2>
                <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                  {ui.customerRegisterSub}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> {ui.fullNameLabel}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={ui.fullNamePlaceholder}
                  className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50/50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-400 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {ui.emailLabel}
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  autoComplete="email"
                  className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50/50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-400 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {ui.phoneLabel}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="+998901234567"
                  className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50/50 px-4 py-3 text-sm font-extrabold outline-none focus:border-teal-400 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> {ui.passwordLabel}
                </label>
                <input
                  type={showCustomerPassword ? "text" : "password"}
                  value={customerPassword}
                  onChange={(e) => setCustomerPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50/50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-400 focus:bg-white"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">
                  {ui.confirmPasswordLabel}
                </label>
                <input
                  type={showCustomerPassword ? "text" : "password"}
                  value={customerPassword2}
                  onChange={(e) => setCustomerPassword2(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50/50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-400 focus:bg-white"
                  required
                  minLength={6}
                />
              </div>

              {customerError && (
                <p className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                  {customerError}
                </p>
              )}

              <button
                type="submit"
                disabled={customerLoading}
                className="w-full rounded-2xl py-3.5 text-sm font-black text-white shadow-md disabled:opacity-60"
                style={{ background: primaryColor }}
              >
                {customerLoading ? ui.loading : ui.registerBtn}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerMode("login");
                  setCustomerError("");
                }}
                className="w-full py-2 text-xs font-bold text-stone-400 hover:text-stone-600"
              >
                {ui.haveAccountLogin}
              </button>
            </form>
          )}

          {activeTab === "courier" && (
            <form onSubmit={(e) => void handleCourierSubmit(e)} className="space-y-4">
              <div>
                <h2 className="text-lg font-black text-stone-900">{ui.courierTab}</h2>
                <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                  {ui.courierWelcomeSub}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {ui.emailLabel}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setCourierError("");
                    setEmail(e.target.value);
                  }}
                  placeholder="example@cafe.com"
                  autoComplete="username"
                  className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50/50 px-4 py-3 text-sm font-bold outline-none focus:border-stone-800 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> {ui.passwordLabel}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setCourierError("");
                      setPassword(e.target.value);
                    }}
                    autoComplete="current-password"
                    className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50/50 px-4 py-3 pr-12 text-sm font-bold outline-none focus:border-stone-800 focus:bg-white"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {courierError && (
                <p className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                  {courierError}
                </p>
              )}

              <button
                type="submit"
                disabled={courierLoading}
                className="w-full rounded-2xl bg-stone-900 py-3.5 text-sm font-black text-white shadow-md disabled:opacity-60"
              >
                {courierLoading ? ui.loading : ui.loginBtn}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

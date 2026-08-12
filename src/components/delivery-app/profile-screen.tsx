"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, MapPin, Navigation, Phone, RefreshCw, User, Heart, ArrowRight, LogOut, ArrowLeftRight, Moon, Sun, Monitor } from "lucide-react";
import type { MenuLocale } from "@/lib/menu-i18n";
import { getDeliveryUiLabels } from "@/lib/delivery-ui-labels";
import { useTheme } from "@/components/theme-provider";
import type { Theme } from "@/lib/theme";
import { getBrowserPosition } from "./geo-client";
import { BAEMIN_TEAL } from "./theme";
import type { DeliveryOrderType, DeliveryProfile, DeliveryCategory, DeliveryProduct } from "./types";
import { pickLocalizedName } from "@/lib/menu-i18n";
import { formatPrice } from "@/lib/utils";

type LoyaltyView = {
  points: number;
  cashbackSom: number;
  visitCount: number;
  canRedeem: boolean;
  canRedeemCashback: boolean;
  redeemDiscountSom: number;
  program?: {
    enabled: boolean;
    cashbackPercent: number;
    redeemPeriodLabel: string;
    terms: string;
  };
};

export function DeliveryProfileScreen({
  cafeId,
  cafeName,
  slug,
  primaryColor = BAEMIN_TEAL,
  locale,
  orderType,
  profile,
  deliveryEnabled,
  loyaltyEnabled = false,
  supportPhone = null,
  onLocaleChange,
  onOrderTypeChange,
  onProfileChange,
  onSwitchMode,
  onSetupAppLock,
  onClearAppLock,
  appLockEnabled = false,
  favoriteIds = [],
  categories = [],
  onToggleFavorite,
  onOpenProduct,
  onOpenFavorites,
  onLogout,
}: {
  cafeId: string;
  cafeName: string;
  slug: string;
  primaryColor: string;
  locale: MenuLocale;
  orderType: DeliveryOrderType;
  profile: DeliveryProfile;
  deliveryEnabled: boolean;
  loyaltyEnabled?: boolean;
  supportPhone?: string | null;
  onLocaleChange: (locale: MenuLocale) => void;
  onOrderTypeChange: (t: DeliveryOrderType) => void;
  onProfileChange: (profile: DeliveryProfile) => void;
  onSwitchMode?: () => void;
  onSetupAppLock?: () => void;
  onClearAppLock?: () => void;
  appLockEnabled?: boolean;
  favoriteIds?: string[];
  categories?: DeliveryCategory[];
  onToggleFavorite?: (productId: string) => void;
  onOpenProduct?: (product: DeliveryProduct, categoryId: string) => void;
  onOpenFavorites?: () => void;
  onLogout?: () => void;
}) {
  const [loyalty, setLoyalty] = useState<LoyaltyView | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoMsg, setGeoMsg] = useState("");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => setThemeMounted(true), []);

  const loadLoyalty = useCallback(async () => {
    if (!loyaltyEnabled || !profile.phone) return;
    setLoyaltyLoading(true);
    setLoyaltyError("");
    try {
      const res = await fetch(
        `/api/cafes/${cafeId}/loyalty?phone=${encodeURIComponent(profile.phone)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setLoyaltyError(data.error || "Tekshirib bo'lmadi");
        return;
      }
      setLoyalty(data);
    } catch {
      setLoyaltyError("Tarmoq xatosi");
    } finally {
      setLoyaltyLoading(false);
    }
  }, [cafeId, loyaltyEnabled, profile.phone]);

  useEffect(() => {
    loadLoyalty();
  }, [loadLoyalty]);

  function patchProfile(partial: Partial<DeliveryProfile>) {
    onProfileChange({ ...profile, ...partial });
  }

  const ui = getDeliveryUiLabels(locale);

  const themeOptions: Array<{ id: Theme; label: string; icon: typeof Sun }> = [
    { id: "light", label: ui.themeLight, icon: Sun },
    { id: "dark", label: ui.themeDark, icon: Moon },
    { id: "system", label: ui.themeSystem, icon: Monitor },
  ];

  return (
    <div className="space-y-6 px-4 py-5" style={{ background: "var(--da-card)" }}>
      <div>
        <h2 className="text-lg font-extrabold" style={{ color: "var(--da-ink)" }}>{ui.profileTab}</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--da-muted)" }}>{cafeName}</p>
      </div>

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
          {ui.personalInfo}
        </h3>
        <label
          className="flex items-center gap-2 rounded-2xl border px-3 py-3"
          style={{ background: "var(--da-input)", borderColor: "var(--da-border)" }}
        >
          <User className="h-4 w-4 shrink-0" style={{ color: "var(--da-muted)" }} />
          <input
            value={profile.name}
            onChange={(e) => patchProfile({ name: e.target.value })}
            placeholder={ui.namePlaceholder}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--da-ink)" }}
          />
        </label>
        <label
          className="flex items-center gap-2 rounded-2xl border px-3 py-3"
          style={{ background: "var(--da-input)", borderColor: "var(--da-border)" }}
        >
          <Phone className="h-4 w-4 shrink-0" style={{ color: "var(--da-muted)" }} />
          <input
            value={profile.phone}
            onChange={(e) => patchProfile({ phone: e.target.value })}
            placeholder={ui.phonePlaceholder}
            inputMode="tel"
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--da-ink)" }}
          />
        </label>
        <p className="text-[11px]" style={{ color: "var(--da-muted)" }}>
          {ui.profileHint}
        </p>
      </section>

      {loyaltyEnabled ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              {ui.loyaltyTitle}
            </h3>
            <button
              type="button"
              onClick={loadLoyalty}
              disabled={loyaltyLoading}
              className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-bold text-stone-600 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3 w-3 ${loyaltyLoading ? "animate-spin" : ""}`}
              />
              {ui.checkButton}
            </button>
          </div>

          <div
            className="rounded-2xl p-4 text-white"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, #1a9e99 100%)`,
            }}
          >
            <div className="flex items-center gap-2 text-sm font-semibold opacity-90">
              <Gift className="h-4 w-4" />
              {ui.myBalance}
            </div>
            {loyaltyLoading && !loyalty ? (
              <p className="mt-3 text-sm opacity-80">{ui.loading}</p>
            ) : loyalty ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] opacity-80">{ui.cashback}</p>
                  <p className="text-xl font-extrabold">
                    {loyalty.cashbackSom.toLocaleString(locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ")}{" "}
                    <span className="text-sm font-bold">{ui.som}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] opacity-80">{ui.points}</p>
                  <p className="text-xl font-extrabold">{loyalty.points}</p>
                </div>
                <div className="col-span-2 text-[11px] leading-relaxed opacity-90">
                  {loyalty.canRedeem
                    ? ui.pointsDiscount(loyalty.points, loyalty.redeemDiscountSom.toLocaleString(locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ"))
                    : ui.loyaltyTermsHint}
                  {loyalty.canRedeemCashback
                    ? ui.canRedeemCashback
                    : null}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm opacity-90">
                {ui.noBalanceYet}
              </p>
            )}
          </div>
          {loyaltyError ? (
            <p className="text-sm text-red-500">{loyaltyError}</p>
          ) : null}
          {loyalty?.program?.terms ? (
            <p className="text-[11px] leading-relaxed text-stone-400">
              {loyalty.program.terms}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
          {ui.orderTypeTitle}
        </h3>
        <div className="flex gap-2">
          {(
            [
              ["DELIVERY", ui.delivery],
              ["TAKEAWAY", ui.takeaway],
            ] as const
          ).map(([type, label]) => {
            if (type === "DELIVERY" && !deliveryEnabled) return null;
            const active = orderType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onOrderTypeChange(type)}
                className="flex-1 rounded-xl py-3 text-sm font-bold"
                style={
                  active
                    ? { background: primaryColor, color: "#fff" }
                    : { background: "var(--da-input)", color: "var(--da-ink)" }
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
          {ui.addressTitle}
        </h3>
        <label
          className="flex items-start gap-2 rounded-2xl border p-3"
          style={{ background: "var(--da-input)", borderColor: "var(--da-border)" }}
        >
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--da-muted)" }} />
          <textarea
            value={profile.address}
            onChange={(e) => patchProfile({ address: e.target.value, lat: null, lng: null })}
            rows={3}
            placeholder={ui.addressPlaceholder}
            className="min-h-[4.5rem] w-full resize-none bg-transparent text-sm outline-none"
            style={{ color: "var(--da-ink)" }}
          />
        </label>
        <button
          type="button"
          disabled={geoBusy}
          onClick={async () => {
            setGeoBusy(true);
            setGeoMsg("");
            try {
              const pos = await getBrowserPosition();
              patchProfile({ lat: pos.lat, lng: pos.lng });
              setGeoMsg(
                ui.gpsSaved(pos.lat, pos.lng),
              );
            } catch (e) {
              setGeoMsg(e instanceof Error ? e.message : (locale === "ru" ? "Ошибка GPS" : locale === "en" ? "GPS error" : "GPS xato"));
            } finally {
              setGeoBusy(false);
            }
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          <Navigation className="h-4 w-4" />
          {geoBusy
            ? "…"
            : profile.lat != null
              ? ui.updateGps
              : ui.setGps}
        </button>
        {geoMsg ? (
          <p className="text-[11px] text-stone-500">{geoMsg}</p>
        ) : profile.lat != null ? (
          <p className="text-[11px] text-emerald-600">
            {ui.gpsSuccess}
          </p>
        ) : (
          <p className="text-[11px] text-stone-400">
            {ui.gpsFallbackHint}
          </p>
        )}
      </section>

      {supportPhone?.trim() ? (
        <section className="space-y-2">
          <h3
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: "var(--da-muted)" }}
          >
            {ui.supportTitle}
          </h3>
          <p className="text-[11px]" style={{ color: "var(--da-muted)" }}>
            {ui.supportHint}
          </p>
          <a
            href={`tel:${supportPhone.replace(/[^\d+]/g, "")}`}
            className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-sm font-bold transition active:scale-[0.99]"
            style={{
              background: "var(--da-input)",
              borderColor: "var(--da-border)",
              color: primaryColor,
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {supportPhone.trim()}
            </span>
            <span className="text-xs font-extrabold opacity-90">{ui.supportCall}</span>
          </a>
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--da-muted)" }}>
          {ui.languageTitle}
        </h3>
        <div className="flex gap-2">
          {(
            [
              ["uz", "O'zbek"],
              ["ru", "Русский"],
              ["en", "English"],
            ] as const
          ).map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => onLocaleChange(code)}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold"
              style={
                locale === code
                  ? { background: primaryColor, color: "#fff" }
                  : { background: "var(--da-input)", color: "var(--da-ink)" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--da-muted)" }}>
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
                    : { background: "var(--da-input)", color: "var(--da-ink)" }
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

      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--da-muted)" }}>
          {ui.securityTitle}
        </h3>
        <div
          className="rounded-2xl border p-3"
          style={{
            background: "var(--da-input)",
            borderColor: "var(--da-border)",
          }}
        >
          <p className="text-sm font-bold" style={{ color: "var(--da-ink)" }}>
            {ui.appLockTitle} {appLockEnabled ? ui.appLockEnabled : ""}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--da-muted)" }}>
            {ui.appLockDesc}
          </p>
          <div className="mt-3 flex gap-2">
            {onSetupAppLock ? (
              <button
                type="button"
                onClick={onSetupAppLock}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white"
                style={{ background: primaryColor }}
              >
                {appLockEnabled ? ui.reSetup : ui.setup}
              </button>
            ) : null}
            {appLockEnabled && onClearAppLock ? (
              <button
                type="button"
                onClick={onClearAppLock}
                className="flex-1 rounded-xl border py-2.5 text-sm font-bold"
                style={{
                  background: "var(--da-card)",
                  borderColor: "var(--da-border)",
                  color: "var(--da-ink)",
                }}
              >
                {ui.delete}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Ilova rejimi va hisob */}
      <section className="space-y-2 border-t pt-2" style={{ borderColor: "var(--da-border)" }}>
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--da-muted)" }}>
          {locale === "ru" ? "Режим приложения и аккаунт" : locale === "en" ? "App mode and account" : "Ilova rejimi va hisob"}
        </h3>
        <div className="space-y-2.5">
          {onSwitchMode && (
            <button
              type="button"
              onClick={onSwitchMode}
              className="flex w-full items-center justify-between rounded-2xl border p-4 shadow-sm transition"
              style={{
                background: "var(--da-input)",
                borderColor: "var(--da-border)",
                color: "var(--da-ink)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm"
                  style={{
                    background: "color-mix(in srgb, var(--da-accent) 18%, var(--da-card))",
                    color: "var(--da-accent)",
                  }}
                >
                  <ArrowLeftRight className="h-5 w-5" />
                </span>
                <div className="text-left">
                  <p className="text-sm font-extrabold">{ui.switchMode}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4" style={{ color: "var(--da-muted)" }} />
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center justify-between rounded-2xl border p-4 shadow-sm transition"
              style={{
                background: "color-mix(in srgb, #ef4444 14%, var(--da-card))",
                borderColor: "color-mix(in srgb, #ef4444 40%, transparent)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm"
                  style={{
                    background: "color-mix(in srgb, #ef4444 22%, var(--da-card))",
                    color: "#f87171",
                  }}
                >
                  <LogOut className="h-5 w-5" />
                </span>
                <div className="text-left">
                  <p
                    className="text-sm font-extrabold"
                    style={{ color: "color-mix(in srgb, #ef4444 70%, var(--da-ink))" }}
                  >
                    {ui.logoutTitle}
                  </p>
                  <p
                    className="mt-0.5 text-[11px] font-medium"
                    style={{ color: "color-mix(in srgb, #ef4444 45%, var(--da-muted))" }}
                  >
                    {locale === "ru"
                      ? "Выйти из системы и очистить профиль"
                      : locale === "en"
                        ? "Log out and clear profile"
                        : "Tizimdan chiqish va profilni tozalash"}
                  </p>
                </div>
              </div>
              <ArrowRight
                className="h-4 w-4"
                style={{ color: "color-mix(in srgb, #ef4444 55%, var(--da-muted))" }}
              />
            </button>
          )}
        </div>
      </section>

      {/* Saralanganlar tugmasi */}
      <section className="space-y-2 border-t pt-2" style={{ borderColor: "var(--da-border)" }}>
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--da-muted)" }}>
          {locale === "ru" ? "Личная коллекция" : locale === "en" ? "Personal collection" : "Shaxsiy to'plam"}
        </h3>
        <button
          type="button"
          onClick={onOpenFavorites}
          className="flex w-full items-center justify-between rounded-2xl border p-4 shadow-sm transition"
          style={{
            background: "var(--da-input)",
            borderColor: "var(--da-border)",
            color: "var(--da-ink)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm"
              style={{
                background: "color-mix(in srgb, #ef4444 18%, var(--da-card))",
                color: "#f87171",
              }}
            >
              <Heart className="h-5 w-5 fill-current" />
            </span>
            <div className="text-left">
              <p className="text-sm font-extrabold">{ui.favoritesTitle}</p>
              <p className="mt-0.5 text-[11px] font-medium" style={{ color: "var(--da-muted)" }}>
                {favoriteIds.length > 0 ? ui.favoritesCount(favoriteIds.length) : ui.favoritesEmpty}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4" style={{ color: "var(--da-muted)" }} />
        </button>
      </section>
    </div>
  );
}

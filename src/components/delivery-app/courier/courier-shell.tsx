"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Bike,
  Coffee,
  History,
  Package,
  User,
} from "lucide-react";
import { BrandIntroSplash } from "@/components/brand-intro-splash";
import { StaffPinGuard } from "@/components/staff-pin-guard";
import {
  BrowserGeoError,
  getBrowserPosition,
  isGeoSecureContext,
  watchBrowserPosition,
} from "../geo-client";
import { CourierInsightsScreen } from "./courier-insights";
import {
  CourierHistoryScreen,
  CourierOrdersScreen,
} from "./courier-orders";
import { CourierProfileScreen } from "./courier-profile";
import type { MenuLocale } from "@/lib/menu-i18n";

type CourierTab = "orders" | "history" | "insights" | "profile";
type GpsStatus = "off" | "ok" | "asking" | "denied" | "insecure" | "err";

export function CourierShell({
  cafeId,
  cafeName,
  primaryColor,
  logoUrl = null,
  user,
  onLogout,
  locale = "uz",
}: {
  cafeId: string;
  cafeName: string;
  primaryColor: string;
  logoUrl?: string | null;
  user: { id: string; name: string; email: string };
  onLogout: () => void;
  locale?: MenuLocale;
}) {
  const [tab, setTab] = useState<CourierTab>("orders");
  const [displayName, setDisplayName] = useState(user.name);
  const [dutyLoaded, setDutyLoaded] = useState(false);
  const [onDuty, setOnDuty] = useState(false);
  const [dutyBusy, setDutyBusy] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("off");
  const [liveLocation, setLiveLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [usingCafeFallback, setUsingCafeFallback] = useState(false);
  const [cafeGeo, setCafeGeo] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const stopWatchRef = useRef<(() => void) | null>(null);
  const lastSentRef = useRef(0);

  const setDuty = useCallback(
    async (next: boolean) => {
      setDutyBusy(true);
      try {
        const res = await fetch(`/api/cafes/${cafeId}/courier/duty`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ onDuty: next }),
        });
        const data = await res.json();
        if (res.ok) setOnDuty(Boolean(data.onDuty));
      } finally {
        setDutyBusy(false);
      }
    },
    [cafeId],
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cafes/${cafeId}/courier/duty`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setOnDuty(Boolean(d.onDuty));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDutyLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [cafeId]);

  const sendLocation = useCallback(
    (lat: number, lng: number, fromCafe = false) => {
      setGpsStatus("ok");
      setLiveLocation({ lat, lng });
      setUsingCafeFallback(fromCafe);
      const now = Date.now();
      if (now - lastSentRef.current < 8000) return;
      lastSentRef.current = now;
      void fetch(`/api/cafes/${cafeId}/courier/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
    },
    [cafeId],
  );

  const startWatch = useCallback(() => {
    stopWatchRef.current?.();
    stopWatchRef.current = watchBrowserPosition(
      (lat, lng) => sendLocation(lat, lng, false),
      (_msg, code) => {
        if (code === "denied") setGpsStatus("denied");
        else if (code === "insecure") setGpsStatus("insecure");
        else setGpsStatus("err");
      },
    );
  }, [sendLocation]);

  const requestGps = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("err");
      return;
    }
    if (!isGeoSecureContext()) {
      setGpsStatus("insecure");
      return;
    }

    setGpsStatus("asking");
    try {
      let pos: { lat: number; lng: number };
      try {
        pos = await getBrowserPosition({
          enableHighAccuracy: true,
          timeout: 18000,
          maximumAge: 0,
        });
      } catch (first) {
        if (first instanceof BrowserGeoError && first.code === "denied") {
          throw first;
        }
        pos = await getBrowserPosition({
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 60_000,
        });
      }
      sendLocation(pos.lat, pos.lng, false);
      startWatch();
    } catch (e) {
      if (e instanceof BrowserGeoError) {
        if (e.code === "denied") setGpsStatus("denied");
        else if (e.code === "insecure") setGpsStatus("insecure");
        else setGpsStatus("err");
      } else {
        setGpsStatus("denied");
      }
    }
  }, [sendLocation, startWatch]);

  useEffect(() => {
    fetch(`/api/cafes/${cafeId}/courier/orders`)
      .then((r) => r.json())
      .then((d) => {
        const lat = d.cafe?.latitude;
        const lng = d.cafe?.longitude;
        if (typeof lat === "number" && typeof lng === "number") {
          setCafeGeo({ lat, lng });
        }
      })
      .catch(() => {});
  }, [cafeId]);

  useEffect(() => {
    if (!onDuty || !isGeoSecureContext()) return;
    let cancelled = false;
    (async () => {
      try {
        const perm = await navigator.permissions?.query({
          name: "geolocation" as PermissionName,
        });
        if (cancelled || perm?.state !== "granted") return;
        void requestGps();
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
      stopWatchRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cafeId, onDuty]);

  return (
    <>
      <BrandIntroSplash
        title={cafeName}
        subtitle="Kuryer"
        storageKey={`nookline-courier-intro-${cafeId}`}
        durationMs={2000}
        logoUrl={logoUrl}
        accentColor={primaryColor}
      />
    <div
      className="delivery-app-root courier-app-root mx-auto min-h-[100dvh] w-full max-w-md"
      style={
        {
          ["--da-accent"]: primaryColor,
          ["--dp-accent"]: primaryColor,
          ["--dp-accent-soft"]: `${primaryColor}22`,
        } as React.CSSProperties
      }
    >
      <StaffPinGuard cafeId={cafeId}>
        {!dutyLoaded ? (
          <p className="px-4 py-16 text-center text-sm text-stone-400">
            {locale === "ru" ? "Загрузка…" : locale === "en" ? "Loading…" : "Yuklanmoqda…"}
          </p>
        ) : (
          <>
            <header
              className="px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white"
              style={{ background: primaryColor }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bike className="h-5 w-5" />
                  <p className="text-sm font-semibold opacity-90">
                    {locale === "ru" ? "Доставщик" : locale === "en" ? "Courier" : "Yetkazuvchi"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={dutyBusy}
                  onClick={() => void setDuty(!onDuty)}
                  className="rounded-full px-2.5 py-1 text-[11px] font-bold disabled:opacity-60"
                  style={
                    onDuty
                      ? {
                          background: "rgba(255,255,255,0.22)",
                          color: "#ffffff",
                          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
                        }
                      : {
                          background: "#ffffff",
                          color: "#1c1917",
                        }
                  }
                >
                  {onDuty 
                    ? (locale === "ru" ? "На работе → отдых" : locale === "en" ? "On duty → rest" : "Ishda → dam")
                    : (locale === "ru" ? "Не на работе → включить" : locale === "en" ? "Off duty → turn on" : "Ishda emas → yoqish")
                  }
                </button>
              </div>
              <h1 className="mt-1 text-xl font-extrabold">{cafeName}</h1>
              <p className="text-sm opacity-85">{displayName}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold opacity-95">
                {onDuty ? (
                  <>
                    <Bike className="h-3.5 w-3.5" /> {locale === "ru" ? "Статус: На работе" : locale === "en" ? "Status: On duty" : "Status: Ishda"}
                  </>
                ) : (
                  <>
                    <Coffee className="h-3.5 w-3.5" /> {locale === "ru" ? "Статус: Не на работе" : locale === "en" ? "Status: Off duty" : "Status: Ishda emas"}
                  </>
                )}
              </p>
            </header>

            {!onDuty ? (
              <div
                className="mx-4 mt-3 rounded-2xl px-3 py-3"
                style={{
                  background: "var(--da-card)",
                  border: "1px solid var(--da-border)",
                }}
              >
                <p className="text-sm font-bold" style={{ color: "var(--da-ink)" }}>
                  {locale === "ru" ? "Вы сейчас не на работе" : locale === "en" ? "You are not on duty now" : "Hozir ishda emassiz"}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--da-muted)" }}>
                  {locale === "ru" 
                    ? "Новые заказы не будут поступать. Сессия сохранена — повторный вход не требуется." 
                    : locale === "en" 
                    ? "New orders will not arrive. Session is saved — no re-login needed." 
                    : "Yangi buyurtmalar kelmaydi. Sessiya saqlanadi — qayta login kerak emas."
                  }
                </p>
                <button
                  type="button"
                  disabled={dutyBusy}
                  onClick={() => void setDuty(true)}
                  className="mt-2.5 w-full rounded-xl py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
                  style={{ background: primaryColor }}
                >
                  {locale === "ru" ? "Отметить как на работе" : locale === "en" ? "Mark as on duty" : "Ishda deb belgilash"}
                </button>
              </div>
            ) : null}

            <div className="pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
              {tab === "orders" && (
                <CourierOrdersScreen
                  cafeId={cafeId}
                  primaryColor={primaryColor}
                  liveLocation={liveLocation}
                  onDuty={onDuty}
                  locale={locale}
                />
              )}
              {tab === "history" && (
                <CourierHistoryScreen
                  cafeId={cafeId}
                  primaryColor={primaryColor}
                  locale={locale}
                />
              )}
              {tab === "insights" && (
                <CourierInsightsScreen
                  cafeId={cafeId}
                  primaryColor={primaryColor}
                />
              )}
              {tab === "profile" && (
                <CourierProfileScreen
                  cafeId={cafeId}
                  primaryColor={primaryColor}
                  user={{ ...user, name: displayName }}
                  gpsStatus={gpsStatus}
                  usingCafeFallback={usingCafeFallback}
                  cafeGeo={cafeGeo}
                  onDuty={onDuty}
                  onDutyChange={(v) => void setDuty(v)}
                  onRequestGps={requestGps}
                  onUseCafeFallback={() => {
                    if (cafeGeo) sendLocation(cafeGeo.lat, cafeGeo.lng, true);
                  }}
                  onLogout={onLogout}
                  onProfileSaved={setDisplayName}
                  locale={locale}
                />
              )}
            </div>

            <nav
              className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 px-1 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl"
              style={{
                background: "var(--da-nav)",
                borderTop: "1px solid var(--da-border)",
              }}
            >
              {(
                [
                  ["orders", locale === "ru" ? "Заказы" : locale === "en" ? "Orders" : "Buyurtma", Package],
                  ["history", locale === "ru" ? "История" : locale === "en" ? "History" : "Tarix", History],
                  ["insights", locale === "ru" ? "Аналитика" : locale === "en" ? "Insights" : "Maslahat", BarChart3],
                  ["profile", locale === "ru" ? "Профиль" : locale === "en" ? "Profile" : "Profil", User],
                ] as const
              ).map(([id, label, Icon]) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-bold"
                    style={{
                      color: active
                        ? primaryColor
                        : "color-mix(in srgb, var(--da-ink) 72%, var(--da-muted))",
                    }}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                );
              })}
            </nav>
          </>
        )}
      </StaffPinGuard>
    </div>
    </>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  Clock,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Star,
} from "lucide-react";
import {
  estimateEtaMinutes,
  formatDistanceKm,
  haversineKm,
} from "@/lib/geo";
import { formatPrice } from "@/lib/utils";
import type { MenuLocale } from "@/lib/menu-i18n";
import { getDeliveryUiLabels } from "@/lib/delivery-ui-labels";

type CourierOrder = {
  id: string;
  orderNumber: number;
  status: string;
  statusLabel: string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerLat?: number | null;
  customerLng?: number | null;
  notes: string | null;
  totalAmount: number;
  paymentMethod?: string | null;
  paidAt?: string | null;
  mine: boolean;
  available: boolean;
  upcoming: boolean;
  distanceKm?: number | null;
  distanceLabel?: string | null;
  etaMinutes?: number | null;
  distanceTarget?: "customer" | "cafe" | null;
  items: { quantity: number; product: { name: string } }[];
  review?: { score: number; comment?: string | null } | null;
};

type TodayStats = {
  orderCount: number;
  revenueLabel: string;
  avgRating: number | null;
  ratingCount: number;
};

function phoneHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

function mapsHref(order: CourierOrder) {
  if (order.customerLat != null && order.customerLng != null) {
    return `https://www.google.com/maps?q=${order.customerLat},${order.customerLng}`;
  }
  if (order.customerAddress) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerAddress)}`;
  }
  return null;
}

function yandexMapsHref(order: CourierOrder) {
  if (order.customerLat != null && order.customerLng != null) {
    return `https://yandex.uz/maps/?rtext=~${order.customerLat},${order.customerLng}`;
  }
  if (order.customerAddress) {
    return `https://yandex.uz/maps/?text=${encodeURIComponent(order.customerAddress)}`;
  }
  return null;
}

function getCourierEta(notes: string | null): number | null {
  if (!notes) return null;
  const match = notes.match(/\[ETA:\s*(\d+)\]/);
  return match ? parseInt(match[1], 10) : null;
}

function getCleanNotes(notes: string | null): string | null {
  if (!notes) return null;
  const cleaned = notes.replace(/\[ETA:\s*\d+\]\s*/g, "").trim();
  return cleaned || null;
}

const MAP_BTN_BASE =
  "inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2.5 text-xs font-extrabold shadow-md transition active:scale-[0.98]";

function MapNavButtons({
  googleMap,
  yandexMap,
}: {
  googleMap: string | null;
  yandexMap: string | null;
}) {
  if (!googleMap && !yandexMap) return null;
  return (
    <div className="mt-2 flex gap-2">
      {googleMap ? (
        <a
          href={googleMap}
          target="_blank"
          rel="noreferrer"
          title="Google Maps"
          className={MAP_BTN_BASE}
          style={{
            background: "#EA4335",
            color: "#ffffff",
            boxShadow: "0 4px 12px rgba(234, 67, 53, 0.35)",
          }}
        >
          <MapPin className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          <span className="truncate">Google Maps</span>
        </a>
      ) : null}
      {yandexMap ? (
        <a
          href={yandexMap}
          target="_blank"
          rel="noreferrer"
          title="Yandex Navigator"
          className={MAP_BTN_BASE}
          style={{
            background: "#FFCC00",
            color: "#1a1a1a",
            boxShadow: "0 4px 12px rgba(255, 204, 0, 0.4)",
          }}
        >
          <Navigation className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          <span className="truncate">Yandex</span>
        </a>
      ) : null}
    </div>
  );
}

function withLiveDistance(
  order: CourierOrder,
  live: { lat: number; lng: number } | null,
  cafe: { latitude: number | null; longitude: number | null } | null,
): CourierOrder {
  if (!live) return order;
  const destLat =
    order.customerLat != null && order.customerLng != null
      ? order.customerLat
      : cafe?.latitude ?? null;
  const destLng =
    order.customerLat != null && order.customerLng != null
      ? order.customerLng
      : cafe?.longitude ?? null;
  if (destLat == null || destLng == null) return order;
  const km = haversineKm(live.lat, live.lng, destLat, destLng);
  return {
    ...order,
    distanceKm: km,
    distanceLabel: formatDistanceKm(km),
    etaMinutes: estimateEtaMinutes(km),
    distanceTarget:
      order.customerLat != null && order.customerLng != null ? "customer" : "cafe",
  };
}

export function CourierOrdersScreen({
  cafeId,
  primaryColor,
  liveLocation,
  onDuty = true,
  locale = "uz",
}: {
  cafeId: string;
  primaryColor: string;
  liveLocation: { lat: number; lng: number } | null;
  onDuty?: boolean;
  locale?: MenuLocale;
}) {
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [cafeGeo, setCafeGeo] = useState<{
    latitude: number | null;
    longitude: number | null;
  } | null>(null);
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showEtaModalForId, setShowEtaModalForId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const knownIdsRef = useRef<Set<string> | null>(null);
  const ui = getDeliveryUiLabels(locale);

  const load = useCallback(async () => {
    try {
      const [ordersRes, statsRes] = await Promise.all([
        fetch(`/api/cafes/${cafeId}/courier/orders`),
        fetch(`/api/cafes/${cafeId}/courier/stats`),
      ]);
      const ordersData = await ordersRes.json();
      const statsData = await statsRes.json();
      if (!ordersRes.ok) {
        setError(ordersData.error || ui.loading);
        return;
      }
      const nextOrders = (ordersData.orders ?? []) as CourierOrder[];
      setCafeGeo(ordersData.cafe ?? null);
      setOrders(nextOrders);
      if (statsRes.ok) setStats(statsData.today ?? null);
      setError("");

      const alertIds = nextOrders
        .filter((o) => o.upcoming || o.available)
        .map((o) => o.id);
      const prev = knownIdsRef.current;
      if (prev) {
        const fresh = alertIds.filter((id) => !prev.has(id));
        if (fresh.length > 0) {
          try {
            navigator.vibrate?.([200, 80, 200, 80, 400]);
          } catch {
            /* ignore */
          }
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            const o = nextOrders.find((x) => x.id === fresh[0]);
            if (o) {
              const titleText = o.available
                ? (locale === "ru" ? "Доставка готова!" : locale === "en" ? "Delivery ready!" : "Yetkazish tayyor!")
                : (locale === "ru" ? "Новая доставка" : locale === "en" ? "New delivery" : "Yangi yetkazish");
              const addressText = o.customerAddress || (locale === "ru" ? "адрес" : locale === "en" ? "address" : "manzil");
              new Notification(
                titleText,
                {
                  body: `#${String(o.orderNumber).padStart(3, "0")} — ${addressText}`,
                  tag: `courier-local-${o.id}`,
                },
              );
            }
          }
        }
      }
      knownIdsRef.current = new Set(alertIds);
    } catch {
      setError(ui.networkError);
    } finally {
      setLoading(false);
    }
  }, [cafeId, locale, ui.loading, ui.networkError]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function claim(id: string, etaMinutes?: number) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/orders/${id}/courier-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etaMinutes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (locale === "ru" ? "Не принято" : locale === "en" ? "Not accepted" : "Qabul qilinmadi"));
        return;
      }
      await load();
    } finally {
      setBusyId(null);
      setShowEtaModalForId(null);
    }
  }

  async function deliver(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/orders/${id}/courier-deliver`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (locale === "ru" ? "Не завершено" : locale === "en" ? "Not completed" : "Yakunlanmadi"));
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const enriched = orders.map((o) => withLiveDistance(o, liveLocation, cafeGeo));
  const upcoming = enriched.filter((o) => o.upcoming);
  const mine = enriched.filter((o) => o.mine);
  const available = enriched.filter((o) => o.available);

  return (
    <div className="space-y-5 px-4 py-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold" style={{ color: "var(--da-ink)" }}>
          {ui.courierOrdersTitle}
        </h2>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{ background: "var(--da-input)", color: "var(--da-muted)" }}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {ui.refreshBtn}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div
          className="rounded-2xl p-3 shadow-sm"
          style={{ background: "var(--da-card)", border: "1px solid var(--da-border)" }}
        >
          <p className="text-[10px] font-bold uppercase" style={{ color: "var(--da-muted)" }}>
            {ui.todayLabel}
          </p>
          <p className="mt-1 text-xl font-extrabold" style={{ color: "var(--da-ink)" }}>
            {stats?.orderCount ?? "—"}
          </p>
          <p className="text-[11px]" style={{ color: "var(--da-muted)" }}>
            {ui.ordersCountLabel}
          </p>
        </div>
        <div
          className="rounded-2xl p-3 shadow-sm"
          style={{ background: "var(--da-card)", border: "1px solid var(--da-border)" }}
        >
          <p className="text-[10px] font-bold uppercase" style={{ color: "var(--da-muted)" }}>
            {ui.ratingLabel}
          </p>
          <p
            className="mt-1 flex items-center gap-1 text-xl font-extrabold"
            style={{ color: "var(--da-ink)" }}
          >
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {stats?.avgRating != null ? stats.avgRating : "—"}
          </p>
          <p className="text-[11px]" style={{ color: "var(--da-muted)" }}>
            {stats?.ratingCount ? ui.ratingsCount(stats.ratingCount) : ui.noRatingsYet}
          </p>
        </div>
        <div
          className="rounded-2xl p-3 shadow-sm"
          style={{ background: "var(--da-card)", border: "1px solid var(--da-border)" }}
        >
          <p className="text-[10px] font-bold uppercase" style={{ color: "var(--da-muted)" }}>
            {ui.salesLabel}
          </p>
          <p
            className="mt-1 text-sm font-extrabold leading-tight"
            style={{ color: "var(--da-ink)" }}
          >
            {stats?.revenueLabel ?? "—"}
          </p>
          <p className="text-[11px]" style={{ color: "var(--da-muted)" }}>
            {ui.todayLabel.toLowerCase()}
          </p>
        </div>
      </div>

      {!onDuty ? (
        <p
          className="rounded-xl px-3 py-2 text-xs font-medium"
          style={{ background: "var(--da-input)", color: "var(--da-muted)" }}
        >
          {ui.notOnDuty}
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <Section title={ui.upcomingSectionTitle} empty={ui.upcomingSectionEmpty}>
        {upcoming.map((o) => (
          <WaitingCard key={o.id} order={o} primaryColor={primaryColor} locale={locale} />
        ))}
      </Section>

      <Section title={ui.mineSectionTitle} empty={ui.mineSectionEmpty}>
        {mine.map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            primaryColor={primaryColor}
            busy={busyId === o.id}
            actionLabel={locale === "ru" ? "Доставил" : locale === "en" ? "Delivered" : "Yetkazdim"}
            onAction={() => deliver(o.id)}
            locale={locale}
          />
        ))}
      </Section>

      <Section title={ui.availableSectionTitle} empty={ui.availableSectionEmpty}>
        {available.map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            primaryColor={primaryColor}
            busy={busyId === o.id}
            actionLabel={locale === "ru" ? "Принять" : locale === "en" ? "Accept" : "Qabul qilish"}
            onAction={() => setShowEtaModalForId(o.id)}
            unaccepted
            locale={locale}
          />
        ))}
      </Section>

      {showEtaModalForId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm rounded-3xl p-5 shadow-xl animate-in zoom-in-95 duration-200"
            style={{ background: "var(--da-card)", border: "1px solid var(--da-border)" }}
          >
            <h3 className="text-lg font-extrabold" style={{ color: "var(--da-ink)" }}>
              {ui.etaModalTitle}
            </h3>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--da-muted)" }}>
              {ui.etaModalDesc}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[15, 20, 30, 40, 50, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => claim(showEtaModalForId, mins)}
                  className="rounded-2xl py-3 text-sm font-bold active:scale-95 transition"
                  style={{
                    border: "1px solid var(--da-border)",
                    color: "var(--da-ink)",
                    background: "var(--da-input)",
                  }}
                >
                  {ui.minutesLabel(mins)}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => claim(showEtaModalForId)}
                className="flex-1 rounded-2xl py-3 text-xs font-bold transition"
                style={{ background: "var(--da-input)", color: "var(--da-muted)" }}
              >
                {ui.noEtaLabel}
              </button>
              <button
                type="button"
                onClick={() => setShowEtaModalForId(null)}
                className="flex-1 rounded-2xl py-3 text-xs font-bold transition"
                style={{
                  border: "1px solid var(--da-border)",
                  color: "var(--da-muted)",
                  background: "transparent",
                }}
              >
                {ui.cancelBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CourierHistoryScreen({
  cafeId,
  primaryColor,
  locale = "uz",
}: {
  cafeId: string;
  primaryColor: string;
  locale?: MenuLocale;
}) {
  const [items, setItems] = useState<
    (CourierOrder & {
      updatedAt: string;
      review?: { score: number; comment: string | null } | null;
    })[]
  >([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const ui = getDeliveryUiLabels(locale);

  const loadHistory = useCallback(() => {
    setLoading(true);
    const query = selectedDate ? `?date=${selectedDate}` : "";
    fetch(`/api/cafes/${cafeId}/courier/stats${query}`)
      .then((r) => r.json())
      .then((d) => setItems(d.history ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [cafeId, selectedDate]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <div className="space-y-4 px-4 py-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold" style={{ color: "var(--da-ink)" }}>
            {ui.historyTitle}
          </h2>
          <p className="text-xs" style={{ color: "var(--da-muted)" }}>
            {ui.historySubtitle(selectedDate)}
          </p>
        </div>
        <div className="relative flex items-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1"
            style={{
              background: "var(--da-card)",
              border: "1px solid var(--da-border)",
              color: "var(--da-ink)",
            }}
          />
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate("")}
              className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black transition"
              style={{ background: "var(--da-input)", color: "var(--da-muted)" }}
              title={ui.clearFilterTitle}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm" style={{ color: "var(--da-muted)" }}>
          {ui.loading}
        </p>
      ) : items.length === 0 ? (
        <div
          className="rounded-2xl px-4 py-12 text-center shadow-sm"
          style={{
            background: "var(--da-card)",
            border: "1px solid var(--da-border)",
          }}
        >
          <p className="text-sm font-bold" style={{ color: "var(--da-muted)" }}>
            {selectedDate ? ui.noHistoryFound : ui.noHistoryYet}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((o) => (
            <OrderCard key={o.id} order={o} primaryColor={primaryColor} done locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const childArray = Array.isArray(children) ? children : [children];
  const has = childArray.some((c) => c != null && c !== false);
  return (
    <section className="space-y-2">
      <h3
        className="text-xs font-bold uppercase tracking-wider"
        style={{ color: "var(--da-muted)" }}
      >
        {title}
      </h3>
      {has ? (
        children
      ) : (
        <p
          className="rounded-2xl px-4 py-6 text-center text-sm font-medium"
          style={{
            background: "var(--da-card)",
            border: "1px solid var(--da-border)",
            color: "var(--da-muted)",
          }}
        >
          {empty}
        </p>
      )}
    </section>
  );
}

function PaymentInfoBadge({ order, locale = "uz" }: { order: CourierOrder; locale?: MenuLocale }) {
  if (!order.paymentMethod) return null;

  const isPaid = order.paidAt != null;
  const ui = getDeliveryUiLabels(locale);
  let methodLabel = "";

  if (order.paymentMethod === "PAYME") {
    methodLabel = ui.paymeMethod;
  } else if (order.paymentMethod === "CARD") {
    methodLabel = ui.cardMethod;
  } else if (order.paymentMethod === "CASH") {
    methodLabel = ui.cashMethod;
  }

  const tone = isPaid ? "#10b981" : order.paymentMethod === "PAYME" ? "#f59e0b" : "#ef4444";

  return (
    <div
      className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold"
      style={{
        background: `color-mix(in srgb, ${tone} 16%, var(--da-card))`,
        border: `1px solid color-mix(in srgb, ${tone} 35%, transparent)`,
        color: tone,
      }}
    >
      <span>
        {ui.paymentLabel}: {methodLabel}
      </span>
      <span>·</span>
      <span>{isPaid ? ui.paidLabel : ui.unpaidLabel}</span>
    </div>
  );
}

function WaitingCard({
  order,
  primaryColor,
  locale = "uz",
}: {
  order: CourierOrder;
  primaryColor: string;
  locale?: MenuLocale;
}) {
  const googleMap = mapsHref(order);
  const yandexMap = yandexMapsHref(order);
  const cleanNotes = getCleanNotes(order.notes);
  const ui = getDeliveryUiLabels(locale);

  return (
    <article
      className="rounded-2xl border-2 border-dashed p-4"
      style={{
        borderColor: "color-mix(in srgb, #ef4444 55%, var(--da-border))",
        background: "color-mix(in srgb, #ef4444 14%, var(--da-card))",
        color: "var(--da-ink)",
      }}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500 text-white shadow-md shadow-red-500/20">
          <Bell className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-extrabold" style={{ color: "var(--da-ink)" }}>
              #{String(order.orderNumber).padStart(3, "0")}
            </p>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                background: "color-mix(in srgb, #ef4444 22%, var(--da-card))",
                color: "#ef4444",
              }}
            >
              <Clock className="h-3 w-3" />
              {order.statusLabel}
            </span>
          </div>
          <p className="mt-1 text-sm font-bold text-red-500">
            {ui.waitingArrivalDesc}
          </p>
          {order.customerName && (
            <p className="mt-1 text-xs font-extrabold" style={{ color: "var(--da-ink)" }}>
              {ui.customerLabel}: {order.customerName}
            </p>
          )}
          <DistanceLine order={order} locale={locale} />

          <PaymentInfoBadge order={order} locale={locale} />

          {order.customerAddress && (
            <div className="mt-2">
              <p
                className="flex items-start gap-1.5 text-xs font-semibold"
                style={{ color: "var(--da-muted)" }}
              >
                <MapPin
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  style={{ color: "var(--da-muted)" }}
                />
                {order.customerAddress}
              </p>
              <MapNavButtons googleMap={googleMap} yandexMap={yandexMap} />
            </div>
          )}
          {order.customerPhone ? (
            <a
              href={phoneHref(order.customerPhone)}
              className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-bold text-red-500"
            >
              <Phone className="h-4 w-4" />
              {order.customerPhone}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DistanceLine({ order, locale = "uz" }: { order: CourierOrder; locale?: MenuLocale }) {
  if (!order.distanceLabel) return null;
  const ui = getDeliveryUiLabels(locale);
  return (
    <p
      className="mt-2 inline-flex items-center gap-1 text-xs font-bold"
      style={{ color: "var(--da-ink)" }}
    >
      <Navigation className="h-3.5 w-3.5" />
      ~{order.distanceLabel}
      {order.etaMinutes != null ? ` · ~${order.etaMinutes} ${ui.minutesShort}` : ""}
      {order.distanceTarget === "cafe" ? ui.distanceToCafe : ui.distanceToCustomer}
    </p>
  );
}

function OrderCard({
  order,
  primaryColor,
  busy,
  actionLabel,
  onAction,
  done,
  unaccepted,
  locale = "uz",
}: {
  order: CourierOrder;
  primaryColor: string;
  busy?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  done?: boolean;
  unaccepted?: boolean;
  locale?: MenuLocale;
}) {
  const googleMap = mapsHref(order);
  const yandexMap = yandexMapsHref(order);
  const cleanNotes = getCleanNotes(order.notes);
  const courierEta = getCourierEta(order.notes);
  const ui = getDeliveryUiLabels(locale);

  return (
    <article
      className={`rounded-2xl p-4 shadow-sm transition ${
        unaccepted ? "border-2 border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10" : ""
      }`}
      style={
        unaccepted
          ? undefined
          : {
              background: "var(--da-card, #fff)",
              border: "1px solid var(--da-border, #f5f5f4)",
              color: "var(--da-ink, #1c1917)",
            }
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xl font-extrabold" style={{ color: unaccepted ? "#EF4444" : primaryColor }}>
            #{String(order.orderNumber).padStart(3, "0")}
          </p>
          <p className="text-xs font-semibold" style={{ color: "var(--da-muted, #a8a29e)" }}>
            {order.statusLabel}
          </p>
          <DistanceLine order={order} locale={locale} />
          {courierEta && (
            <p className="mt-1 text-xs font-bold text-emerald-600">
              {ui.etaSetLabel(courierEta)}
            </p>
          )}
        </div>
        <p className="text-sm font-bold" style={{ color: "var(--da-ink)" }}>
          {formatPrice(order.totalAmount)}
        </p>
      </div>

      <ul className="mt-3 space-y-1 text-sm" style={{ color: "var(--da-ink)" }}>
        {order.items.map((item, i) => (
          <li key={`${item.product.name}-${i}`}>
            {item.quantity}× {item.product.name}
          </li>
        ))}
      </ul>

      <div
        className="mt-3 space-y-2 rounded-xl px-3 py-2 text-xs"
        style={{
          background: unaccepted
            ? "color-mix(in srgb, #ef4444 10%, var(--da-card))"
            : "var(--da-input)",
          border: unaccepted
            ? "1px solid color-mix(in srgb, #ef4444 30%, transparent)"
            : "1px solid var(--da-border)",
          color: "var(--da-muted)",
        }}
      >
        {order.customerName ? (
          <p className="font-extrabold text-sm" style={{ color: "var(--da-ink)" }}>
            {ui.customerLabel}: {order.customerName}
          </p>
        ) : null}
        
        {/* Payment Info */}
        <PaymentInfoBadge order={order} locale={locale} />

        {order.customerPhone ? (
          <div className="mt-1">
            <a
              href={phoneHref(order.customerPhone)}
              className="inline-flex items-center gap-1.5 text-sm font-bold"
              style={{ color: unaccepted ? "#EF4444" : primaryColor }}
            >
              <Phone className="h-4 w-4" />
              {ui.callLabel} · {order.customerPhone}
            </a>
          </div>
        ) : null}
        
        {order.customerAddress && (
          <div className="mt-1">
            <p
              className="flex items-start gap-1.5 font-medium"
              style={{ color: "var(--da-ink, #44403c)" }}
            >
              <MapPin
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                style={{ color: "var(--da-muted, #a8a29e)" }}
              />
              {order.customerAddress}
            </p>
            <MapNavButtons googleMap={googleMap} yandexMap={yandexMap} />
          </div>
        )}
        {cleanNotes ? (
          <p className="mt-1 font-medium" style={{ color: "var(--da-ink, #44403c)" }}>
            {ui.commentLabel}: {cleanNotes}
          </p>
        ) : null}
      </div>

      {done && order.review && (
        <div
          className="mt-3 rounded-xl border p-2.5 text-xs"
          style={{
            background: "color-mix(in srgb, #f59e0b 14%, var(--da-card, #fff))",
            borderColor: "color-mix(in srgb, #f59e0b 35%, var(--da-border, transparent))",
          }}
        >
          <p
            className="flex items-center gap-1 font-bold"
            style={{ color: "color-mix(in srgb, #fbbf24 70%, var(--da-ink, #92400e))" }}
          >
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {ui.customerRatingLabel}: {order.review.score} / 5
          </p>
          {order.review.comment && (
            <p
              className="mt-1.5 italic leading-relaxed"
              style={{ color: "var(--da-ink, #44403c)" }}
            >
              &ldquo;{order.review.comment}&rdquo;
            </p>
          )}
        </div>
      )}

      {done ? (
        <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
          <Check className="h-3.5 w-3.5" /> {ui.deliveredLabel}
        </p>
      ) : onAction && actionLabel ? (
        <button
          type="button"
          disabled={busy}
          onClick={onAction}
          className="mt-3 w-full rounded-xl py-3 text-sm font-extrabold text-white disabled:opacity-60 transition active:scale-[0.98]"
          style={{ background: unaccepted ? "#EF4444" : primaryColor }}
        >
          {busy ? "…" : actionLabel}
        </button>
      ) : null}
    </article>
  );
}

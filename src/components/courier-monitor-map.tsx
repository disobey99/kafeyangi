"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Truck,
  User,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import { formatPrice } from "@/lib/utils";

type MonitorCourier = {
  userId: string;
  name: string;
  phone: string | null;
  onDuty: boolean;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string | null;
  locationFresh: boolean;
  activeOrderIds: string[];
  headingTo: {
    orderId: string;
    orderNumber: number;
    address: string | null;
    customerLat: number | null;
    customerLng: number | null;
    statusLabel: string;
    etaMinutes: number | null;
  } | null;
};

type MonitorDelivery = {
  orderId: string;
  orderNumber: number;
  status: string;
  statusLabel: string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerLat: number | null;
  customerLng: number | null;
  assignedCourierId: string | null;
  etaMinutes: number | null;
  totalAmount: number;
  destinationLabel?: string | null;
};

type MonitorData = {
  cafe: { name: string; latitude: number | null; longitude: number | null };
  couriers: MonitorCourier[];
  activeDeliveries: MonitorDelivery[];
  fetchedAt: string;
};

const TASHKENT: [number, number] = [41.2995, 69.2401];
const POLL_MS = 8000;

function mapsGoogle(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function mapsYandex(lat: number, lng: number) {
  return `https://yandex.uz/maps/?rtext=~${lat},${lng}`;
}

function mapsGoogleAddress(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function mapsYandexAddress(address: string) {
  return `https://yandex.uz/maps/?text=${encodeURIComponent(address)}`;
}

function formatAgo(iso: string | null): string {
  if (!iso) return "GPS yo‘q";
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec} s oldin`;
  if (sec < 3600) return `${Math.floor(sec / 60)} daq oldin`;
  return `${Math.floor(sec / 3600)} soat oldin`;
}

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function CourierMonitorMap({ cafeId }: { cafeId: string }) {
  const [data, setData] = useState<MonitorData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const focusRef = useRef<[number, number] | null>(null);
  const fittedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafeId}/courier/monitor`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Yuklanmadi");
        return;
      }
      setData(json as MonitorData);
      setError("");
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    async function initMap() {
      if (!mapElRef.current || mapRef.current) return;
      const L = await import("leaflet");
      if (cancelled || !mapElRef.current) return;
      LRef.current = L;

      // Fix default marker icons in bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapElRef.current, { zoomControl: true }).setView(
        TASHKENT,
        12,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(map);

      const layers = L.layerGroup().addTo(map);
      mapRef.current = map;
      layerRef.current = layers;
      setMapReady(true);
      window.setTimeout(() => map.invalidateSize(), 80);
    }
    void initMap();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      LRef.current = null;
      fittedRef.current = false;
      setMapReady(false);
    };
  }, []);

  const courierById = useMemo(() => {
    const m = new Map<string, MonitorCourier>();
    data?.couriers.forEach((c) => m.set(c.userId, c));
    return m;
  }, [data]);

  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const layers = layerRef.current;
    if (!mapReady || !L || !map || !layers || !data) return;

    layers.clearLayers();
    const bounds: [number, number][] = [];

    const cafeLat = data.cafe.latitude;
    const cafeLng = data.cafe.longitude;
    if (cafeLat != null && cafeLng != null) {
      bounds.push([cafeLat, cafeLng]);
      const cafeIcon = L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;border-radius:10px;background:#16A398;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:grid;place-items:center;color:#fff;font-size:14px;font-weight:800">K</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([cafeLat, cafeLng], { icon: cafeIcon })
        .bindPopup(`<b>${escapeHtml(data.cafe.name)}</b><br/>Kafe`)
        .addTo(layers);
    }

    for (const c of data.couriers) {
      if (c.latitude == null || c.longitude == null) continue;
      bounds.push([c.latitude, c.longitude]);
      const color = !c.onDuty ? "#78716c" : c.locationFresh ? "#16A398" : "#f59e0b";
      const destLine = c.headingTo?.address
        ? `<br/><b>Ketayotgan:</b> #${String(c.headingTo.orderNumber).padStart(3, "0")}<br/>${escapeHtml(c.headingTo.address)}`
        : "<br/><i>Hozircha manzil yo‘q</i>";
      const icon = L.divIcon({
        className: "",
        html: `<div style="min-width:34px;height:34px;padding:0 6px;border-radius:999px;background:${color};border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;white-space:nowrap">${escapeHtml(c.name.slice(0, 8))}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const marker = L.marker([c.latitude, c.longitude], { icon })
        .bindPopup(
          `<b>${escapeHtml(c.name)}</b><br/>${c.onDuty ? "Ishda" : "Damda"} · ${c.locationFresh ? "GPS yangi" : "GPS eski"}${destLine}`,
        )
        .addTo(layers);
      marker.on("click", () => setSelectedId(`courier:${c.userId}`));
    }

    for (const d of data.activeDeliveries) {
      const num = String(d.orderNumber).padStart(3, "0");
      const addr =
        d.destinationLabel ||
        d.customerAddress ||
        (d.customerLat != null && d.customerLng != null
          ? `${d.customerLat.toFixed(5)}, ${d.customerLng.toFixed(5)}`
          : "Manzil");
      const courier = d.assignedCourierId
        ? courierById.get(d.assignedCourierId)
        : null;

      if (d.customerLat != null && d.customerLng != null) {
        bounds.push([d.customerLat, d.customerLng]);
        const shortAddr =
          addr.length > 28 ? `${escapeHtml(addr.slice(0, 28))}…` : escapeHtml(addr);
        const icon = L.divIcon({
          className: "",
          html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
            <div style="min-width:44px;height:28px;padding:0 8px;border-radius:8px;background:#ef4444;border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800">#${num}</div>
            <div style="max-width:140px;padding:2px 6px;border-radius:6px;background:rgba(15,23,42,.88);color:#fff;font-size:10px;font-weight:700;line-height:1.2;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.3)">${shortAddr}</div>
          </div>`,
          iconSize: [140, 52],
          iconAnchor: [70, 14],
        });
        L.marker([d.customerLat, d.customerLng], { icon })
          .bindPopup(
            `<b>#${num}</b> · ${escapeHtml(d.statusLabel)}<br/><b>Manzil:</b> ${escapeHtml(addr)}${
              courier ? `<br/><b>Kuryer:</b> ${escapeHtml(courier.name)}` : ""
            }`,
          )
          .addTo(layers)
          .on("click", () => setSelectedId(`order:${d.orderId}`));

        if (courier?.latitude != null && courier.longitude != null) {
          L.polyline(
            [
              [courier.latitude, courier.longitude],
              [d.customerLat, d.customerLng],
            ],
            {
              color: "#16A398",
              weight: 4,
              opacity: 0.85,
              dashArray: "8 6",
            },
          ).addTo(layers);
        }
      }
    }

    if (focusRef.current) {
      map.setView(focusRef.current, Math.max(map.getZoom(), 14), { animate: true });
      focusRef.current = null;
    } else if (!fittedRef.current) {
      fittedRef.current = true;
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } else if (cafeLat != null && cafeLng != null) {
        map.setView([cafeLat, cafeLng], 13);
      } else {
        map.setView(TASHKENT, 12);
      }
    }
  }, [data, courierById, mapReady]);

  function focusLatLng(lat: number, lng: number, id: string) {
    setSelectedId(id);
    focusRef.current = [lat, lng];
    mapRef.current?.setView([lat, lng], 15, { animate: true });
  }

  const onDutyCount = data?.couriers.filter((c) => c.onDuty).length ?? 0;
  const freshCount = data?.couriers.filter((c) => c.locationFresh).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--dp-text)]">Kuryer nazorati</h1>
          <p className="mt-1 text-sm text-[var(--dp-muted)]">
            Jonli joylashuv · {onDutyCount} ishda · {freshCount} GPS yangi ·{" "}
            {data?.activeDeliveries.length ?? 0} faol yetkazish
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--dp-border)] bg-[var(--dp-input-bg)] px-3 py-2 text-xs font-bold text-[var(--dp-text)]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Yangilash
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div
          className="overflow-hidden rounded-2xl border border-[var(--dp-border)] bg-[var(--dp-card)] shadow-sm"
          style={{ minHeight: 420 }}
        >
          <div ref={mapElRef} className="h-[min(70vh,640px)] w-full min-h-[420px]" />
        </div>

        <aside className="flex max-h-[min(70vh,640px)] flex-col gap-4 overflow-hidden">
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--dp-border)] bg-[var(--dp-card)] shadow-sm">
            <div className="flex items-center gap-2 border-b border-[var(--dp-border)] px-3 py-2.5">
              <Truck className="h-4 w-4 text-[var(--dp-accent)]" />
              <h2 className="text-sm font-extrabold text-[var(--dp-text)]">Kuryerlar</h2>
              <span className="ml-auto text-[11px] font-bold text-[var(--dp-muted)]">
                {data?.couriers.length ?? 0}
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
              {!data?.couriers.length ? (
                <p className="px-2 py-6 text-center text-xs text-[var(--dp-muted)]">
                  Kuryer topilmadi
                </p>
              ) : (
                data.couriers.map((c) => {
                  const orders = data.activeDeliveries.filter((d) =>
                    c.activeOrderIds.includes(d.orderId),
                  );
                  const selected = selectedId === `courier:${c.userId}`;
                  return (
                    <button
                      key={c.userId}
                      type="button"
                      onClick={() => {
                        if (c.latitude != null && c.longitude != null) {
                          focusLatLng(c.latitude, c.longitude, `courier:${c.userId}`);
                        } else {
                          setSelectedId(`courier:${c.userId}`);
                        }
                      }}
                      className="w-full rounded-xl border px-3 py-2.5 text-left transition"
                      style={{
                        borderColor: selected
                          ? "var(--dp-accent)"
                          : "var(--dp-border)",
                        background: selected
                          ? "color-mix(in srgb, var(--dp-accent) 12%, var(--dp-card))"
                          : "var(--dp-input-bg)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-extrabold text-[var(--dp-text)]">
                          {c.name}
                        </p>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            background: c.onDuty
                              ? "color-mix(in srgb, #16A398 18%, transparent)"
                              : "color-mix(in srgb, var(--dp-muted) 18%, transparent)",
                            color: c.onDuty ? "#16A398" : "var(--dp-muted)",
                          }}
                        >
                          {c.onDuty ? "Ishda" : "Damda"}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--dp-muted)]">
                        {c.locationFresh ? "GPS yangi" : "GPS eski / yo‘q"} ·{" "}
                        {formatAgo(c.updatedAt)}
                      </p>
                      {c.phone ? (
                        <a
                          href={phoneHref(c.phone)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--dp-accent)]"
                        >
                          <Phone className="h-3 w-3" />
                          {c.phone}
                        </a>
                      ) : null}
                      {c.headingTo ? (
                        <div
                          className="mt-2 rounded-lg px-2 py-1.5"
                          style={{
                            background: "color-mix(in srgb, #ef4444 14%, var(--dp-card))",
                            border: "1px solid color-mix(in srgb, #ef4444 35%, transparent)",
                          }}
                        >
                          <p className="text-[10px] font-extrabold uppercase tracking-wide text-red-500">
                            Ketayotgan · #
                            {String(c.headingTo.orderNumber).padStart(3, "0")}
                          </p>
                          <p className="mt-0.5 text-[11px] font-bold leading-snug text-[var(--dp-text)]">
                            {c.headingTo.address || "Manzil kiritilmagan"}
                          </p>
                          {c.headingTo.etaMinutes != null ? (
                            <p className="mt-0.5 text-[10px] font-semibold text-[var(--dp-muted)]">
                              ETA ~{c.headingTo.etaMinutes} daq
                            </p>
                          ) : null}
                        </div>
                      ) : orders.length > 0 ? (
                        <p className="mt-1 text-[11px] font-semibold text-[var(--dp-text)]">
                          Buyurtma:{" "}
                          {orders
                            .map((o) => `#${String(o.orderNumber).padStart(3, "0")}`)
                            .join(", ")}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-[var(--dp-muted)]">
                          Faol buyurtma yo‘q
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--dp-border)] bg-[var(--dp-card)] shadow-sm">
            <div className="flex items-center gap-2 border-b border-[var(--dp-border)] px-3 py-2.5">
              <MapPin className="h-4 w-4 text-red-500" />
              <h2 className="text-sm font-extrabold text-[var(--dp-text)]">
                Faol yetkazishlar
              </h2>
              <span className="ml-auto text-[11px] font-bold text-[var(--dp-muted)]">
                {data?.activeDeliveries.length ?? 0}
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
              {!data?.activeDeliveries.length ? (
                <p className="px-2 py-6 text-center text-xs text-[var(--dp-muted)]">
                  Faol yetkazish yo‘q
                </p>
              ) : (
                data.activeDeliveries.map((d) => {
                  const courier = d.assignedCourierId
                    ? courierById.get(d.assignedCourierId)
                    : null;
                  const selected = selectedId === `order:${d.orderId}`;
                  const hasCoords = d.customerLat != null && d.customerLng != null;
                  const dest =
                    d.destinationLabel ||
                    d.customerAddress ||
                    (hasCoords
                      ? `${d.customerLat!.toFixed(5)}, ${d.customerLng!.toFixed(5)}`
                      : null);
                  const googleHref = hasCoords
                    ? mapsGoogle(d.customerLat!, d.customerLng!)
                    : dest
                      ? mapsGoogleAddress(dest)
                      : null;
                  const yandexHref = hasCoords
                    ? mapsYandex(d.customerLat!, d.customerLng!)
                    : dest
                      ? mapsYandexAddress(dest)
                      : null;
                  return (
                    <div
                      key={d.orderId}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (hasCoords) {
                          focusLatLng(
                            d.customerLat!,
                            d.customerLng!,
                            `order:${d.orderId}`,
                          );
                        } else {
                          setSelectedId(`order:${d.orderId}`);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          (e.currentTarget as HTMLElement).click();
                        }
                      }}
                      className="w-full cursor-pointer rounded-xl border px-3 py-2.5 text-left transition"
                      style={{
                        borderColor: selected
                          ? "var(--dp-accent)"
                          : "var(--dp-border)",
                        background: selected
                          ? "color-mix(in srgb, var(--dp-accent) 12%, var(--dp-card))"
                          : "var(--dp-input-bg)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-extrabold text-[var(--dp-accent)]">
                          #{String(d.orderNumber).padStart(3, "0")}
                        </p>
                        <span className="text-[10px] font-bold text-[var(--dp-muted)]">
                          {d.statusLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-red-500">
                        Yetkazish manzili
                      </p>
                      <p className="mt-0.5 text-xs font-bold leading-snug text-[var(--dp-text)]">
                        {dest || "Manzil kiritilmagan"}
                      </p>
                      {!hasCoords && dest ? (
                        <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-300">
                          Xaritada nuqta uchun manzil aniqlanmoqda…
                        </p>
                      ) : null}
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--dp-muted)]">
                        <User className="h-3 w-3" />
                        {courier ? courier.name : "Kuryer biriktirilmagan"}
                        {d.etaMinutes != null ? ` · ETA ${d.etaMinutes} daq` : ""}
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-[var(--dp-text)]">
                        {formatPrice(d.totalAmount)}
                      </p>
                      <div className="mt-2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {d.customerPhone ? (
                          <a
                            href={phoneHref(d.customerPhone)}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#16A398] px-2 py-1.5 text-[10px] font-extrabold text-white"
                          >
                            <Phone className="h-3 w-3" />
                            Mijoz
                          </a>
                        ) : null}
                        {googleHref ? (
                          <a
                            href={googleHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#EA4335] px-2 py-1.5 text-[10px] font-extrabold text-white"
                          >
                            <MapPin className="h-3 w-3" />
                            Google
                          </a>
                        ) : null}
                        {yandexHref ? (
                          <a
                            href={yandexHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#FFCC00] px-2 py-1.5 text-[10px] font-extrabold text-[#1a1a1a]"
                          >
                            <Navigation className="h-3 w-3" />
                            Yandex
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

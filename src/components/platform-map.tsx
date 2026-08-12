"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Store } from "lucide-react";
import { coordsForRegion } from "@/lib/uz-regions";
import { planLabel, type PlanId } from "@/lib/plans";
import { CAFE_STATUS_LABELS } from "@/lib/utils";

type MapCafe = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  address: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  locationExact: boolean;
  _count: { orders: number; tables: number };
};

/** Oddiy xarita: OSM embed + hududlar bo'yicha ro'yxat */
export function PlatformMap({ cafes }: { cafes: MapCafe[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    cafes.find((c) => c.latitude != null || c.region)?.id ?? cafes[0]?.id ?? null,
  );

  const points = useMemo(() => {
    return cafes
      .map((c) => {
        let lat = c.latitude;
        let lng = c.longitude;
        if (lat == null || lng == null) {
          const coords = coordsForRegion(c.region);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
          }
        }
        if (lat == null || lng == null) return null;
        return { ...c, lat, lng, locationExact: c.locationExact };
      })
      .filter(Boolean) as Array<MapCafe & { lat: number; lng: number }>;
  }, [cafes]);

  const selected = points.find((p) => p.id === selectedId) ?? points[0];
  const byRegion = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cafes) {
      const key = c.region || "Noma'lum";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [cafes]);

  const mapSrc = selected
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${selected.lng - 0.35}%2C${selected.lat - 0.22}%2C${selected.lng + 0.35}%2C${selected.lat + 0.22}&layer=mapnik&marker=${selected.lat}%2C${selected.lng}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=55.9%2C37.1%2C73.2%2C45.6&layer=mapnik`;

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
          <h2 className="text-sm font-bold text-stone-900">Hududlar</h2>
          <ul className="mt-3 space-y-1.5">
            {byRegion.map(([region, count]) => (
              <li
                key={region}
                className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-stone-700">{region}</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                  {count}
                </span>
              </li>
            ))}
            {byRegion.length === 0 && (
              <p className="text-xs text-stone-400">Hudud belgilanmagan</p>
            )}
          </ul>
        </div>

        <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
          <h2 className="text-sm font-bold text-stone-900">Kafelar xaritada</h2>
          {points.length === 0 ? (
            <p className="mt-2 text-xs text-stone-400">
              Kafe tahririda hudud tanlang — xaritada ko&apos;rinadi
            </p>
          ) : (
            points.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  selectedId === c.id
                    ? "border-amber-400 bg-amber-50"
                    : "border-stone-100 hover:bg-stone-50"
                }`}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span className="min-w-0">
                  <span className="block font-semibold text-stone-900">{c.name}</span>
                  <span className="block text-xs text-stone-500">
                    {c.region || "Hudud yo'q"} · {CAFE_STATUS_LABELS[c.status] ?? c.status}
                    {c.locationExact ? " · aniq" : " · taxminiy"}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <div>
            <p className="font-bold text-stone-900">
              {selected?.name ?? "O'zbekiston"}
            </p>
            <p className="text-xs text-stone-500">
              {selected
                ? `${selected.region || "Hudud"} · ${planLabel(selected.plan as PlanId)} · ${selected.locationExact ? "Aniq joy" : "Taxminiy joy"}`
                : "Kafe tanlang"}
            </p>
          </div>
          {selected && (
            <Link
              href={`/platform/cafes`}
              className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <Store className="h-3.5 w-3.5" />
              Boshqarish
            </Link>
          )}
        </div>
        <iframe
          title="Kafelar xaritasi"
          src={mapSrc}
          className="h-[520px] w-full border-0"
          loading="lazy"
        />
        {selected?.address && (
          <p className="border-t border-stone-100 px-4 py-2 text-xs text-stone-500">
            {selected.address}
            {selected.phone ? ` · ${selected.phone}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

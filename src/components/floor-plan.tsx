"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coffee } from "lucide-react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import { FloorMapCanvas, type FloorMapTable } from "@/components/floor-map-canvas";
import { FloorZoneTabs } from "@/components/floor-zone-tabs";
import { TABLE_ZONE_ORDER, type TableZone } from "@/lib/table-zones";

const STATUS_CYCLE = ["FREE", "OCCUPIED", "BILL_REQUESTED"] as const;

const LEGEND = [
  { label: "Bo'sh", dot: "free" },
  { label: "Band", dot: "busy" },
  { label: "Tayyor", dot: "ready" },
  { label: "Hisob so'ralgan", dot: "bill" },
];

export function FloorPlan({ cafeId }: { cafeId: string }) {
  const [tables, setTables] = useState<FloorMapTable[]>([]);
  const [cafeName, setCafeName] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeZone, setActiveZone] = useState<TableZone>("HALL");

  const load = useCallback(async () => {
    const res = await fetch(`/api/cafes/${cafeId}/floor`);
    const data = await res.json();
    setTables(data.tables ?? []);
    if (data.cafeName) setCafeName(data.cafeName);
    setLoading(false);
  }, [cafeId]);

  useEffect(() => {
    load();
  }, [load]);

  useCafeRealtime(cafeId, load);

  const activeZones = useMemo(() => {
    const set = new Set<string>(TABLE_ZONE_ORDER);
    for (const t of tables) {
      if (t.zone) set.add(t.zone);
    }
    return Array.from(set);
  }, [tables]);

  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const zone of activeZones) {
      counts[zone] = tables.filter((t) => (t.zone ?? "HALL") === zone).length;
    }
    return counts;
  }, [tables, activeZones]);

  const zoneTables = useMemo(
    () => tables.filter((t) => (t.zone ?? "HALL") === activeZone),
    [tables, activeZone],
  );

  const stats = useMemo(() => {
    const free = zoneTables.filter((t) => {
      if (t.displayStatus) return t.displayStatus === "FREE";
      return t.status === "FREE" && (t.openOrderCount ?? 0) === 0;
    }).length;
    return { free, busy: zoneTables.length - free };
  }, [zoneTables]);

  const billAlerts = useMemo(
    () =>
      tables
        .filter((t) => (t.displayStatus ?? t.status) === "BILL_REQUESTED")
        .sort((a, b) => a.number - b.number),
    [tables],
  );

  async function cycleStatus(table: FloorMapTable) {
    const idx = STATUS_CYCLE.indexOf(table.status as (typeof STATUS_CYCLE)[number]);
    const next =
      idx >= 0 ? STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] : STATUS_CYCLE[0];
    await fetch(`/api/tables/${table.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    load();
  }

  return (
    <div>
      <section className="floor-plan-shell overflow-hidden rounded-2xl border border-[var(--dp-border-subtle)]">
        <div className="floor-plan-header border-b border-[var(--dp-border-subtle)]">
          <div className="floor-plan-header-top">
            <div className="floor-plan-header-brand">
              <span className="floor-plan-header-icon" aria-hidden>
                <Coffee className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-[var(--dp-text)]">
                  {cafeName || "Zal sxemasi"}
                </h1>
                <p className="floor-plan-header-sub">Boshqaruv — stollar holati</p>
              </div>
            </div>

            {!loading && (
              <div className="floor-plan-legend">
                {LEGEND.map((l) => (
                  <span key={l.dot}>
                    <i className={`floor-plan-dot floor-plan-dot-${l.dot}`} />
                    {l.label}
                  </span>
                ))}
              </div>
            )}

            {!loading && (
              <span className="floor-plan-header-stats-pill">
                {stats.free} bo&apos;sh · {stats.busy} band
              </span>
            )}
          </div>

          {!loading && billAlerts.length > 0 && (
            <div className="floor-plan-alerts">
              {billAlerts.map((t) => (
                <div key={t.id} className="floor-plan-alert">
                  <i className="floor-plan-dot floor-plan-dot-bill" aria-hidden />
                  Stol {t.number} — to&apos;lov kutilmoqda
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="floor-plan-body">
          <FloorZoneTabs active={activeZone} onChange={setActiveZone} counts={zoneCounts} zones={activeZones} />
          <FloorMapCanvas
            tables={tables}
            loading={loading}
            editable
            cafeId={cafeId}
            activeZone={activeZone}
            onTableSelect={(t) => {
              const table = tables.find((x) => x.id === t.id);
              if (table) cycleStatus(table);
            }}
            onLayoutSaved={load}
          />
        </div>
      </section>

      <p className="mt-4 text-xs text-[var(--dp-muted)]">
        O&apos;rin soni va zona uchun stolga bosing, holatni o&apos;zgartirish uchun ikki marta bosing.
        Buyurtma kelganda stol avtomatik &quot;Band&quot; bo&apos;ladi.
      </p>
    </div>
  );
}

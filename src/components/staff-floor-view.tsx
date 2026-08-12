"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Coffee } from "lucide-react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import { debounce } from "@/lib/debounce";
import { FloorMapCanvas, type FloorMapTable } from "@/components/floor-map-canvas";
import { FloorZoneTabs } from "@/components/floor-zone-tabs";
import { TABLE_ZONE_ORDER, type TableZone } from "@/lib/table-zones";

export function StaffFloorView({
  cafeId,
  cafeName: cafeNameProp,
  selectedTableId,
  onTableSelect,
  compact = false,
  variant = "default",
  currentWaiterId,
}: {
  cafeId: string;
  cafeName?: string;
  selectedTableId?: string | null;
  onTableSelect?: (table: { id: string; number: number }) => void;
  compact?: boolean;
  variant?: "default" | "cashier";
  currentWaiterId?: string;
}) {
  const [tables, setTables] = useState<FloorMapTable[]>([]);
  const [cafeName, setCafeName] = useState(cafeNameProp ?? "");
  const [loading, setLoading] = useState(true);
  const [activeZone, setActiveZone] = useState<TableZone>("HALL");

  const load = useCallback(async () => {
    const res = await fetch(`/api/cafes/${cafeId}/staff-floor`);
    if (res.ok) {
      const data = await res.json();
      setTables(data.tables ?? []);
      if (data.cafeName) setCafeName(data.cafeName);
    }
    setLoading(false);
  }, [cafeId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (cafeNameProp) setCafeName(cafeNameProp);
  }, [cafeNameProp]);

  const loadRef = useRef(load);
  loadRef.current = load;
  const loadDebounced = useRef(debounce(() => loadRef.current(), 400));

  useEffect(() => {
    return () => loadDebounced.current.cancel();
  }, []);

  useCafeRealtime(cafeId, (event) => {
    if (
      event.type === "order.created" ||
      event.type === "order.updated" ||
      event.type === "table.updated" ||
      event.type === "waiter.called" ||
      event.type === "waiter.acknowledged"
    ) {
      loadDebounced.current();
    }
  });

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
    const busy = zoneTables.length - free;
    return { total: zoneTables.length, free, busy };
  }, [zoneTables]);

  const billAlerts = useMemo(
    () =>
      tables
        .filter((t) => (t.displayStatus ?? t.status) === "BILL_REQUESTED")
        .sort((a, b) => a.number - b.number),
    [tables],
  );

  const isCashier = variant === "cashier";
  const title = cafeName || "Zal sxemasi";

  return (
    <section className={isCashier ? "cashier-panel-card floor-plan-shell overflow-hidden rounded-2xl" : "dp-card floor-plan-shell overflow-hidden rounded-2xl"}>
      <div
        className={`floor-plan-header border-b ${isCashier ? "" : "dp-section-bar"}`}
        style={isCashier ? { borderColor: "var(--dp-border-subtle)" } : undefined}
      >
        <div className="floor-plan-header-top">
          <div className="floor-plan-header-brand">
            <span className="floor-plan-header-icon" aria-hidden>
              <Coffee className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2
                className={`font-bold leading-tight ${
                  isCashier ? "text-slate-700" : "text-[var(--dp-text)]"
                }`}
              >
                {compact ? "Zal" : title}
              </h2>
              {!compact && isCashier && (
                <p className="floor-plan-header-sub">Kassir — Zal sxemasi</p>
              )}
            </div>
          </div>

          {!loading && !compact && (
            <div className="floor-plan-legend">
              <span><i className="floor-plan-dot floor-plan-dot-free" /> Bo&apos;sh</span>
              <span><i className="floor-plan-dot floor-plan-dot-busy" /> Band</span>
              <span><i className="floor-plan-dot floor-plan-dot-ready" /> Tayyor</span>
              <span><i className="floor-plan-dot floor-plan-dot-bill" /> Hisob so&apos;ralgan</span>
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
              <button
                key={t.id}
                type="button"
                onClick={() => onTableSelect?.({ id: t.id, number: t.number })}
                className="floor-plan-alert"
              >
                <i className="floor-plan-dot floor-plan-dot-bill" aria-hidden />
                Stol {t.number} — to&apos;lov kutilmoqda
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="floor-plan-body">
        <FloorZoneTabs
          active={activeZone}
          onChange={setActiveZone}
          counts={zoneCounts}
          variant={isCashier ? "cashier" : "default"}
          zones={activeZones}
        />
        <FloorMapCanvas
          tables={tables}
          loading={loading}
          variant={variant}
          activeZone={activeZone}
          selectedTableId={selectedTableId}
          currentWaiterId={currentWaiterId}
          onTableSelect={onTableSelect}
        />
      </div>
    </section>
  );
}

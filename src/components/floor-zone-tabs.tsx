"use client";

import {
  TABLE_ZONE_LABELS,
  TABLE_ZONE_ORDER,
  type TableZone,
} from "@/lib/table-zones";

export function FloorZoneTabs({
  active,
  onChange,
  counts,
  variant = "default",
  zones = TABLE_ZONE_ORDER,
}: {
  active: TableZone;
  onChange: (zone: TableZone) => void;
  counts?: Partial<Record<TableZone, number>>;
  variant?: "default" | "cashier";
  zones?: string[];
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-2xl border border-[var(--dp-border)] bg-[var(--dp-input-bg)] p-3.5 shadow-sm ${
        variant === "cashier" ? "is-cashier" : ""
      }`}
      role="tablist"
      aria-label="Zona"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-[var(--dp-muted)]">
          Zonani tanlang
        </span>
        <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500">
          {zones.length} ta hudud
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {zones.map((zone) => {
          const count = counts?.[zone] ?? 0;
          const isActive = active === zone;
          return (
            <button
              key={zone}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-center transition-all duration-200 active:scale-95 ${
                isActive
                  ? "border-[var(--dp-accent)] bg-[var(--dp-accent-soft)] text-[var(--dp-accent)] shadow-sm"
                  : "border-[var(--dp-border)] bg-[var(--dp-card)] text-[var(--dp-text)] hover:border-stone-300 dark:hover:border-stone-700"
              }`}
              onClick={() => onChange(zone)}
            >
              <span className="text-xs font-extrabold truncate max-w-full px-1">
                {TABLE_ZONE_LABELS[zone] ?? zone}
              </span>
              <span className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-black ${
                isActive 
                  ? "bg-[var(--dp-accent)] text-white" 
                  : "bg-stone-100 dark:bg-stone-800 text-[var(--dp-muted)]"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

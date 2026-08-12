import type { LucideIcon } from "lucide-react";
import { Banknote, Package, TrendingUp, UtensilsCrossed } from "lucide-react";

const iconMap = {
  revenue: Banknote,
  orders: Package,
  products: UtensilsCrossed,
} as const;

export type StatIcon = keyof typeof iconMap;

const accentClass = {
  green: "dp-stat-green",
  amber: "dp-stat-amber",
  blue: "dp-stat-blue",
  stone: "dp-stat-stone",
} as const;

export function StatCard({
  label,
  value,
  icon,
  trend,
  accent = "amber",
}: {
  label: string;
  value: string;
  icon?: StatIcon;
  trend?: string;
  accent?: keyof typeof accentClass;
}) {
  const Icon: LucideIcon | null = icon ? iconMap[icon] : null;

  return (
    <div
      className={`dp-stat-card ${accentClass[accent]} flex h-full flex-col rounded-2xl border p-5 transition-shadow duration-200 hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--dp-muted)]">{label}</p>
          <p className="dp-stat-value mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl">
            {value}
          </p>
          {trend && (
            <p className="mt-2 flex items-center gap-1 text-xs text-[var(--dp-muted)]">
              <TrendingUp className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">{trend}</span>
            </p>
          )}
        </div>
        {Icon && (
          <span className="dp-stat-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
        )}
      </div>
    </div>
  );
}

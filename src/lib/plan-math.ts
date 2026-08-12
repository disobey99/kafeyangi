import type { PlanDiscountConfig } from "@/lib/platform-settings-types";

export function calcDiscountedPrice(basePriceSom: number, percent: number): number {
  const p = Math.min(90, Math.max(0, Math.round(percent)));
  return Math.round((basePriceSom * (100 - p)) / 100);
}

function parseDateStart(value: string): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(`${value.trim()}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDateEnd(value: string): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(`${value.trim()}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isPlanDiscountActive(
  discount: PlanDiscountConfig,
  now = new Date(),
): boolean {
  if (!discount.enabled || discount.percent <= 0) return false;
  const from = parseDateStart(discount.validFrom);
  const to = parseDateEnd(discount.validTo);
  if (!from || !to) return false;
  return now >= from && now <= to;
}

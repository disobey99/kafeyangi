import type { UnitCode } from "@prisma/client";

export function toQtyBase(unit: UnitCode | string, qty: number): number {
  if (unit === "KG" || unit === "L") return Math.round(qty * 1000);
  return Math.round(qty);
}

export function fromQtyBase(unit: UnitCode | string, qtyBase: number): number {
  if (unit === "KG" || unit === "L") return qtyBase / 1000;
  return qtyBase;
}

/** UI: 1500 + KG → "1.5 KG" */
export function formatQtyBase(
  qtyBase: number,
  baseUnit: UnitCode | string,
): string {
  const u = String(baseUnit);
  if (u === "KG" || u === "L") {
    const v = qtyBase / 1000;
    const text = Number.isInteger(v)
      ? String(v)
      : v.toFixed(3).replace(/\.?0+$/, "");
    return `${text} ${u}`;
  }
  return `${Math.round(qtyBase)} ${u}`;
}

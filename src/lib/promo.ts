import type { Promotion, PromoType } from "@prisma/client";

export function isPromoActiveNow(
  promo: Pick<Promotion, "startTime" | "endTime" | "isActive">,
  now = new Date()
): boolean {
  if (!promo.isActive) return false;
  if (!promo.startTime || !promo.endTime) return true;

  const [sh, sm] = promo.startTime.split(":").map(Number);
  const [eh, em] = promo.endTime.split(":").map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = sh * 60 + (sm || 0);
  const end = eh * 60 + (em || 0);

  if (start <= end) {
    return minutes >= start && minutes <= end;
  }
  return minutes >= start || minutes <= end;
}

export function calcDiscount(
  subtotal: number,
  type: PromoType,
  value: number
): number {
  if (type === "PERCENT") {
    return Math.round((subtotal * value) / 100);
  }
  return Math.min(value, subtotal);
}

export function promoLabel(type: PromoType, value: number): string {
  if (type === "PERCENT") return `${value}% chegirma`;
  return `${Math.floor(value / 100).toLocaleString("uz-UZ")} so'm chegirma`;
}

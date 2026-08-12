export function formatPrice(tiyin: number, locale?: string): string {
  const som = Math.floor(tiyin / 100);
  const currency = locale === "ru" ? " сум" : locale === "en" ? " som" : " so'm";
  return som.toLocaleString(locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ") + currency;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/o[''`]/g, "o")
    .replace(/g[''`]/g, "g")
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug bo'sh qolsa, avtomatik yaratadi */
export function ensureSlug(text: string, fallback = "kafe"): string {
  const slug = slugify(text);
  if (slug.length >= 2) return slug.slice(0, 50);
  return `${fallback}-${Date.now().toString(36).slice(-6)}`;
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function cafeRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    OWNER: "Egasi",
    MANAGER: "Nazoratchi",
    CASHIER: "Kassir",
    WAITER: "Ofitsiant",
    KITCHEN: "Oshxona",
    COURIER: "Yetkazuvchi",
  };
  return labels[role] ?? role;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Kutilmoqda",
  CONFIRMED: "Qabul qilindi",
  PREPARING: "Tayyorlanmoqda",
  READY: "Tayyor",
  DELIVERED: "Berildi",
  CANCELLED: "Bekor qilindi",
};

export const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Stolda",
  TAKEAWAY: "Olib ketish",
  DELIVERY: "Yetkazish",
};

export const ORDER_SOURCE_LABELS: Record<string, string> = {
  QR_TABLE: "Mijoz (QR)",
  ONLINE: "Mijoz (onlayn)",
  WAITER: "Ofitsiant",
  CASHIER: "Kassa",
};

/** Buyurtmani kim yuborgan — xodim ismi yoki manba */
export function orderCreatorLabel(order: {
  source: string;
  createdBy?: { name: string } | null;
}): string {
  if (order.createdBy?.name) return order.createdBy.name;
  return ORDER_SOURCE_LABELS[order.source] ?? order.source;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Naqd",
  CARD: "Karta",
  PAYME: "Payme",
};

export const CAFE_STATUS_LABELS: Record<string, string> = {
  TRIAL: "Sinov",
  ACTIVE: "Faol",
  SUSPENDED: "To'xtatilgan",
  CANCELLED: "Bekor qilingan",
};

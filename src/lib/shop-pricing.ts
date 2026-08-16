import "server-only";

import { prisma } from "@/lib/prisma";

export type ShopDiscountRow = {
  id: string;
  name: string;
  code: string | null;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  productIds: string[];
};

export type PricedProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  /** Asosiy narx (tiyin) */
  listPrice: number;
  /** Sotuv narxi — chegirma qo‘llangan (tiyin) */
  price: number;
  compareAtPrice: number | null;
  stock: number;
  featured: boolean;
  category: { id: string; name: string; slug: string } | null;
  discount: {
    id: string;
    name: string;
    label: string;
  } | null;
};

function isDiscountWindowOpen(d: {
  startsAt: Date | null;
  endsAt: Date | null;
}): boolean {
  const now = Date.now();
  if (d.startsAt && d.startsAt.getTime() > now) return false;
  if (d.endsAt && d.endsAt.getTime() < now) return false;
  return true;
}

export async function loadActiveShopDiscounts(): Promise<ShopDiscountRow[]> {
  const rows = await prisma.shopDiscount.findMany({
    where: { isActive: true },
    include: {
      products: { select: { productId: true } },
    },
  });

  return rows
    .filter(isDiscountWindowOpen)
    .filter((d) => d.maxUses == null || d.usedCount < d.maxUses)
    .map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      type: d.type,
      value: d.value,
      minOrderAmount: d.minOrderAmount,
      maxUses: d.maxUses,
      usedCount: d.usedCount,
      productIds: d.products.map((p) => p.productId),
    }));
}

/** Kod kerak bo‘lmagan avtomatik chegirmalar */
export function autoDiscounts(discounts: ShopDiscountRow[]) {
  return discounts.filter((d) => !d.code);
}

export function discountsMatchingCode(
  discounts: ShopDiscountRow[],
  code: string | null | undefined,
) {
  const c = code?.trim().toUpperCase();
  if (!c) return [];
  return discounts.filter((d) => d.code === c);
}

export function discountAppliesToProduct(
  d: ShopDiscountRow,
  productId: string,
): boolean {
  if (d.productIds.length === 0) return true;
  return d.productIds.includes(productId);
}

export function applyDiscountToPrice(
  listPrice: number,
  d: ShopDiscountRow,
): number {
  if (listPrice <= 0) return 0;
  let next =
    d.type === "PERCENT"
      ? Math.round(listPrice * (1 - d.value / 100))
      : listPrice - d.value;
  if (!Number.isFinite(next) || next < 0) next = 0;
  return next;
}

export function discountLabel(d: ShopDiscountRow): string {
  if (d.type === "PERCENT") return `−${d.value}%`;
  const som = Math.round(d.value / 100);
  return `−${som.toLocaleString("uz-UZ")} so'm`;
}

/** Mahsulot uchun eng yaxshi (eng past) narx */
export function bestPriceForProduct(
  productId: string,
  listPrice: number,
  discounts: ShopDiscountRow[],
): { price: number; discount: ShopDiscountRow | null } {
  let best = listPrice;
  let chosen: ShopDiscountRow | null = null;
  for (const d of discounts) {
    if (!discountAppliesToProduct(d, productId)) continue;
    const next = applyDiscountToPrice(listPrice, d);
    if (next < best) {
      best = next;
      chosen = d;
    }
  }
  return { price: best, discount: chosen };
}

export function priceCatalogProduct(
  p: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    featured: boolean;
    category: { id: string; name: string; slug: string } | null;
  },
  discounts: ShopDiscountRow[],
): PricedProduct {
  const { price, discount } = bestPriceForProduct(p.id, p.price, discounts);
  const compareAt =
    price < p.price
      ? Math.max(p.price, p.compareAtPrice ?? 0) || p.price
      : p.compareAtPrice != null && p.compareAtPrice > price
        ? p.compareAtPrice
        : null;

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    imageUrl: p.imageUrl,
    listPrice: p.price,
    price,
    compareAtPrice: compareAt,
    stock: p.stock,
    featured: p.featured,
    category: p.category,
    discount: discount
      ? { id: discount.id, name: discount.name, label: discountLabel(discount) }
      : null,
  };
}

/** Savat uchun: avto + promo kod chegirmalari */
export function resolveCheckoutLines(
  lines: Array<{
    productId: string;
    productName: string;
    listPrice: number;
    qty: number;
  }>,
  discounts: ShopDiscountRow[],
  promoCode?: string | null,
) {
  const applicable = [
    ...autoDiscounts(discounts),
    ...discountsMatchingCode(discounts, promoCode),
  ];
  // Kodli chegirma minOrderAmount — jami listPrice bo‘yicha
  const listTotal = lines.reduce((s, l) => s + l.listPrice * l.qty, 0);
  const filtered = applicable.filter((d) => {
    if (d.minOrderAmount != null && listTotal < d.minOrderAmount) return false;
    return true;
  });

  const usedDiscountIds = new Set<string>();
  const priced = lines.map((l) => {
    const { price, discount } = bestPriceForProduct(
      l.productId,
      l.listPrice,
      filtered,
    );
    if (discount) usedDiscountIds.add(discount.id);
    return {
      productId: l.productId,
      productName: l.productName,
      unitPrice: price,
      listPrice: l.listPrice,
      qty: l.qty,
      discountId: discount?.id ?? null,
    };
  });

  return {
    lines: priced,
    total: priced.reduce((s, l) => s + l.unitPrice * l.qty, 0),
    usedDiscountIds: [...usedDiscountIds],
  };
}

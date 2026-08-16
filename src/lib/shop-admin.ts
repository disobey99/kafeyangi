import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function uniqueShopSlug(
  base: string,
  kind: "category" | "product",
  excludeId?: string,
) {
  let slug = slugify(base) || `item-${Date.now().toString(36)}`;
  let n = 0;
  for (;;) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const exists =
      kind === "category"
        ? await prisma.shopCategory.findFirst({
            where: {
              slug: candidate,
              ...(excludeId ? { NOT: { id: excludeId } } : {}),
            },
            select: { id: true },
          })
        : await prisma.shopProduct.findFirst({
            where: {
              slug: candidate,
              ...(excludeId ? { NOT: { id: excludeId } } : {}),
            },
            select: { id: true },
          });
    if (!exists) return candidate;
    n += 1;
  }
}

export async function getShopStats() {
  const [categories, products, activeProducts, drafts, discounts, lowStock] =
    await Promise.all([
      prisma.shopCategory.count(),
      prisma.shopProduct.count(),
      prisma.shopProduct.count({ where: { status: "ACTIVE" } }),
      prisma.shopProduct.count({ where: { status: "DRAFT" } }),
      prisma.shopDiscount.count({ where: { isActive: true } }),
      prisma.$queryRaw<[{ c: bigint }]>`
        SELECT COUNT(*)::bigint AS c FROM "ShopProduct"
        WHERE "status" = 'ACTIVE' AND "stock" <= COALESCE("lowStockAt", 5)
      `.then((r) => Number(r[0]?.c ?? 0)).catch(async () =>
        prisma.shopProduct.count({
          where: { status: "ACTIVE", stock: { lte: 5 } },
        }),
      ),
    ]);

  return {
    categories,
    products,
    activeProducts,
    drafts,
    discounts,
    lowStock,
  };
}

/** UI uchun so‘m → tiyin */
export function somToTiyin(som: number) {
  return Math.round(som * 100);
}

export function tiyinToSom(tiyin: number) {
  return tiyin / 100;
}

import { prisma } from "@/lib/prisma";
import { isPromoActiveNow, promoLabel } from "@/lib/promo";

export async function loadCafeOnlineCatalog(slug: string) {
  const cafe = await prisma.cafe.findUnique({
    where: { slug },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          products: {
            where: { isAvailable: true },
            orderBy: { sortOrder: "asc" },
            include: {
              modifierGroups: {
                include: { options: { orderBy: { sortOrder: "asc" } } },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
      promotions: {
        where: { isActive: true },
      },
    },
  });

  if (!cafe) return null;

  const customerNotices = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      body: string;
      priority: string;
      createdAt: string | Date;
    }>
  >`
    SELECT id, title, body, priority, createdAt
    FROM Notice
    WHERE cafeId = ${cafe.id} AND audience = 'CUSTOMER'
    ORDER BY createdAt DESC
    LIMIT 5
  `;

  const bannerPromos = cafe.promotions.filter(
    (p) => p.channel === "BANNER" && isPromoActiveNow(p),
  );
  const discountPromos = cafe.promotions.filter(
    (p) => p.channel === "DISCOUNT" && isPromoActiveNow(p),
  );
  const activePromo = discountPromos[0] ?? null;

  return {
    cafe,
    categories: cafe.categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      nameRu: cat.nameRu,
      nameEn: cat.nameEn,
      products: cat.products.map((p) => ({
        id: p.id,
        name: p.name,
        nameRu: p.nameRu,
        nameEn: p.nameEn,
        description: p.description,
        descriptionRu: p.descriptionRu,
        descriptionEn: p.descriptionEn,
        price: p.price,
        discountPrice: p.discountPrice,
        imageUrl: p.imageUrl,
        menuTag: p.menuTag,
        isAvailable: p.isAvailable,
        modifierGroups: p.modifierGroups.map((g) => ({
          id: g.id,
          name: g.name,
          nameRu: g.nameRu,
          nameEn: g.nameEn,
          required: g.required,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          options: g.options.map((o) => ({
            id: o.id,
            name: o.name,
            nameRu: o.nameRu,
            nameEn: o.nameEn,
            priceDelta: o.priceDelta,
          })),
        })),
      })),
    })),
    homePromos: bannerPromos.map((p) => ({
      id: p.id,
      name: p.name,
      label: promoLabel(p.type, p.value),
      type: p.type as "PERCENT" | "FIXED",
      value: p.value,
      imageUrl: p.imageUrl,
      productId: p.productId,
      slot: p.slot,
    })),
    initialPromo: activePromo
      ? {
          id: activePromo.id,
          name: activePromo.name,
          label: promoLabel(activePromo.type, activePromo.value),
          type: activePromo.type as "PERCENT" | "FIXED",
          value: activePromo.value,
          imageUrl: activePromo.imageUrl,
          productId: activePromo.productId,
        }
      : null,
    notices: customerNotices.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      priority: n.priority,
      createdAt: n.createdAt,
    })),
  };
}

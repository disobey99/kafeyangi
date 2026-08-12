import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CustomerTableHub } from "@/components/customer-table-hub";
import { renderCustomerCafeBlockedIfNeeded } from "@/lib/customer-cafe-gate";

export default async function TableMenuPage({
  params,
}: {
  params: Promise<{ slug: string; qrToken: string }>;
}) {
  const { slug, qrToken } = await params;

  const tableMeta = await prisma.table.findFirst({
    where: { qrToken, isActive: true, cafe: { slug } },
    select: {
      cafe: {
        select: {
          id: true,
          name: true,
          status: true,
          suspendReason: true,
          logoUrl: true,
          menuPrimaryColor: true,
          subscriptionEndsAt: true,
          trialEndsAt: true,
        },
      },
    },
  });

  if (!tableMeta) notFound();

  const blockedScreen = await renderCustomerCafeBlockedIfNeeded(
    slug,
    tableMeta.cafe,
  );
  if (blockedScreen) return blockedScreen;

  const table = await prisma.table.findFirst({
    where: { qrToken, isActive: true, cafe: { slug } },
    include: {
      cafe: {
        include: {
          categories: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            include: {
              products: {
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
        },
      },
    },
  });

  if (!table) notFound();

  const cafe = table.cafe;

  return (
    <CustomerTableHub
      menuSlug={slug}
      qrToken={qrToken}
      cafeId={cafe.id}
      cafeName={cafe.name}
      tableId={table.id}
      tableNumber={table.number}
      logoUrl={cafe.logoUrl}
      menuPrimaryColor={cafe.menuPrimaryColor ?? "#d97706"}
      waiterServiceFeePercent={cafe.waiterServiceFeePercent}
      categories={cafe.categories.map((cat) => ({
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
      }))}
    />
  );
}

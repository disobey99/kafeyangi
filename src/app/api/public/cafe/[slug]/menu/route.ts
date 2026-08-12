import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

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
    },
  });

  if (!cafe || cafe.status === "SUSPENDED" || cafe.status === "CANCELLED") {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  return NextResponse.json({
    cafe: {
      id: cafe.id,
      name: cafe.name,
      slug: cafe.slug,
      logoUrl: cafe.logoUrl,
      address: cafe.address,
      phone: cafe.phone,
      menuPrimaryColor: cafe.menuPrimaryColor ?? "#e85d4c",
      minOrderAmountSom: Math.floor(cafe.minOrderAmount / 100),
      deliveryFeeSom: Math.floor(cafe.deliveryFee / 100),
      deliveryTimeMinutes: cafe.deliveryTimeMinutes,
      deliveryEnabled: cafe.deliveryEnabled,
      paymeEnabled: cafe.paymeEnabled,
    },
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
        imageUrl: p.imageUrl,
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
  });
}

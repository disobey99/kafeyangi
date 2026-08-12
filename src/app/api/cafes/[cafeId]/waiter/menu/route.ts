import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { CafeRole } from "@prisma/client";

const WAITER_ROLES: CafeRole[] = [
  CafeRole.OWNER,
  CafeRole.MANAGER,
  CafeRole.WAITER,
  CafeRole.CASHIER,
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId, WAITER_ROLES);
  if (!access.ok) return access.response;

  const categories = await prisma.category.findMany({
    where: { cafeId, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          isAvailable: true,
          modifierGroups: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              nameRu: true,
              nameEn: true,
              required: true,
              minSelect: true,
              maxSelect: true,
              options: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  name: true,
                  nameRu: true,
                  nameEn: true,
                  priceDelta: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    categories: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      products: cat.products,
    })),
  });
}

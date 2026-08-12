import { NextRequest, NextResponse } from "next/server";
import { requireCafeManager } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import { prisma } from "@/lib/prisma";
import { getMaterialBalanceBase } from "@/lib/warehouse";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const feature = await checkPlanFeature(cafeId, "inventoryRation");
  if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

  const warehouseId = request.nextUrl.searchParams.get("warehouseId") ?? undefined;
  const materials = await prisma.rawMaterial.findMany({
    where: { cafeId, isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      baseUnit: true,
      minQtyBase: true,
      reorderQtyBase: true,
    },
  });

  const rows = await Promise.all(
    materials.map(async (material) => {
      const balanceBase = await getMaterialBalanceBase(cafeId, material.id, warehouseId);
      return {
        ...material,
        balanceBase,
        isLow: material.minQtyBase != null ? balanceBase <= material.minQtyBase : false,
      };
    }),
  );

  return NextResponse.json({ stock: rows });
}


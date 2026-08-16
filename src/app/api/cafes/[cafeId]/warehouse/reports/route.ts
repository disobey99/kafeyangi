import { NextRequest, NextResponse } from "next/server";
import { requireCafeInventory } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeInventory(cafeId);
  if (!access.ok) return access.response;

  const feature = await checkPlanFeature(cafeId, "inventoryRation");
  if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

  const [movementAgg, countLines, topMaterials] = await Promise.all([
    prisma.stockMovement.groupBy({
      by: ["movementType"],
      where: { cafeId },
      _count: { id: true },
      _sum: { qtyBase: true },
    }),
    prisma.inventoryCountLine.findMany({
      where: { cafeId },
      select: {
        varianceQtyBase: true,
        rawMaterial: { select: { name: true, baseUnit: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.stockMovement.groupBy({
      by: ["rawMaterialId"],
      where: { cafeId, movementType: "ORDER_CONSUMPTION" },
      _sum: { qtyBase: true },
      orderBy: { _sum: { qtyBase: "desc" } },
      take: 10,
    }),
  ]);

  const names = await prisma.rawMaterial.findMany({
    where: { id: { in: topMaterials.map((t) => t.rawMaterialId) } },
    select: { id: true, name: true, baseUnit: true },
  });
  const nameMap = new Map(names.map((n) => [n.id, n]));

  return NextResponse.json({
    movementAgg,
    recentVariance: countLines,
    topConsumption: topMaterials.map((t) => ({
      rawMaterialId: t.rawMaterialId,
      name: nameMap.get(t.rawMaterialId)?.name ?? t.rawMaterialId,
      baseUnit: nameMap.get(t.rawMaterialId)?.baseUnit ?? "PC",
      qtyBase: t._sum.qtyBase ?? 0,
    })),
  });
}


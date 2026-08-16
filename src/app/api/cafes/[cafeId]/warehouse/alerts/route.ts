import { NextRequest, NextResponse } from "next/server";
import { requireCafeInventory } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import { getLowStockAlerts } from "@/lib/warehouse";
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

  const [lowStock, expiringLots] = await Promise.all([
    getLowStockAlerts(cafeId),
    prisma.materialLot.findMany({
      where: {
        cafeId,
        expiresAt: { not: null },
      },
      include: {
        rawMaterial: { select: { name: true, baseUnit: true } },
        warehouse: { select: { name: true } },
      },
      orderBy: { expiresAt: "asc" },
      take: 100,
    }),
  ]);

  const now = Date.now();
  const sevenDays = 1000 * 60 * 60 * 24 * 7;
  const expirySoon = expiringLots.filter((lot) => {
    if (!lot.expiresAt) return false;
    const diff = lot.expiresAt.getTime() - now;
    return diff >= 0 && diff <= sevenDays;
  });

  return NextResponse.json({ lowStock, expirySoon });
}


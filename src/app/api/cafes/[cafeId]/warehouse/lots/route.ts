import { NextRequest, NextResponse } from "next/server";
import { requireCafeInventory } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeInventory(cafeId);
  if (!access.ok) return access.response;

  const feature = await checkPlanFeature(cafeId, "inventoryRation");
  if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

  const onlyExpiring = request.nextUrl.searchParams.get("expiring") === "1";
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

  const lots = await prisma.materialLot.findMany({
    where: {
      cafeId,
      ...(onlyExpiring ? { expiresAt: { gte: now, lte: sevenDaysLater } } : {}),
    },
    include: {
      rawMaterial: { select: { name: true, baseUnit: true } },
      warehouse: { select: { name: true } },
      supplier: { select: { name: true } },
    },
    orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
    take: 300,
  });

  return NextResponse.json({ lots });
}


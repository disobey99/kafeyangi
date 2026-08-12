import { NextRequest, NextResponse } from "next/server";
import { requireCafeManager } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;
  const feature = await checkPlanFeature(cafeId, "inventoryRation");
  if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

  const sessions = await prisma.inventoryCountSession.findMany({
    where: { cafeId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, title: true, status: true, createdAt: true },
  });
  return NextResponse.json({ sessions });
}


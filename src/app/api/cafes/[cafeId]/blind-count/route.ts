import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  const feature = await checkPlanFeature(cafeId, "inventoryRation");
  if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

  const rows = await prisma.inventoryBlindCount.findMany({
    where: { cafeId },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return NextResponse.json({ rows });
}

const schema = z.object({
  itemName: z.string().min(2),
  expectedQty: z.number().int().min(0),
  countedQty: z.number().int().min(0),
  mismatchReason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  const feature = await checkPlanFeature(cafeId, "inventoryRation");
  if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

  const input = schema.parse(await request.json());
  const status =
    input.countedQty === input.expectedQty
      ? "VERIFIED"
      : input.mismatchReason
        ? "MISMATCH"
        : "PENDING";

  const row = await prisma.inventoryBlindCount.create({
    data: {
      cafeId,
      itemName: input.itemName,
      expectedQty: input.expectedQty,
      countedQty: input.countedQty,
      mismatchReason: input.mismatchReason,
      status,
      createdBy: access.session.userId,
    },
  });

  return NextResponse.json({ row });
}

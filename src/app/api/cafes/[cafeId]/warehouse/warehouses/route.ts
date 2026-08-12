import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import { getOrCreatePrimaryWarehouse } from "@/lib/warehouse";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(40).optional(),
  isPrimary: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;
  const feature = await checkPlanFeature(cafeId, "inventoryRation");
  if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

  await getOrCreatePrimaryWarehouse(cafeId);
  const warehouses = await prisma.warehouse.findMany({
    where: { cafeId, isActive: true },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ warehouses });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;
    const feature = await checkPlanFeature(cafeId, "inventoryRation");
    if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

    const body = createSchema.parse(await request.json());
    await getOrCreatePrimaryWarehouse(cafeId);

    const code =
      body.code?.toUpperCase().replace(/\s+/g, "_") ||
      `WH_${Date.now().toString(36).toUpperCase()}`;

    if (body.isPrimary) {
      await prisma.warehouse.updateMany({
        where: { cafeId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        cafeId,
        name: body.name,
        code,
        isPrimary: Boolean(body.isPrimary),
        isActive: true,
      },
    });
    return NextResponse.json({ warehouse }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ombor yaratilmadi (kod band bo'lishi mumkin)" }, { status: 400 });
  }
}

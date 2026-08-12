import { NextRequest, NextResponse } from "next/server";
import { UnitCode, UnitKind } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";

const createSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  baseUnit: z.nativeEnum(UnitCode),
  unitKind: z.nativeEnum(UnitKind),
  minQtyBase: z.number().int().min(0).nullable().optional(),
  reorderQtyBase: z.number().int().min(0).nullable().optional(),
  trackLots: z.boolean().optional(),
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

  const materials = await prisma.rawMaterial.findMany({
    where: { cafeId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ materials });
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
    const material = await prisma.rawMaterial.create({
      data: {
        cafeId,
        name: body.name.trim(),
        sku: body.sku?.trim() || null,
        baseUnit: body.baseUnit,
        unitKind: body.unitKind,
        minQtyBase: body.minQtyBase ?? null,
        reorderQtyBase: body.reorderQtyBase ?? null,
        trackLots: body.trackLots ?? true,
      },
    });
    return NextResponse.json({ material }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }
}


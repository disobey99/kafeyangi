import { NextRequest, NextResponse } from "next/server";
import { UnitCode, WarehouseMovementType } from "@prisma/client";
import { z } from "zod";
import { requireCafeInventory } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import { createStockMovement, getOrCreatePrimaryWarehouse } from "@/lib/warehouse";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  rawMaterialId: z.string(),
  movementType: z.nativeEnum(WarehouseMovementType),
  unit: z.nativeEnum(UnitCode),
  qty: z.number().int().positive(),
  lotId: z.string().nullable().optional(),
  warehouseId: z.string().optional(),
  note: z.string().optional(),
  unitCostTiyin: z.number().int().min(0).nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeInventory(cafeId);
  if (!access.ok) return access.response;
  const feature = await checkPlanFeature(cafeId, "inventoryRation");
  if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

  const warehouseId = request.nextUrl.searchParams.get("warehouseId") ?? undefined;
  const movements = await prisma.stockMovement.findMany({
    where: { cafeId, ...(warehouseId ? { warehouseId } : {}) },
    include: {
      rawMaterial: { select: { name: true, baseUnit: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ movements });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeInventory(cafeId);
    if (!access.ok) return access.response;
    const feature = await checkPlanFeature(cafeId, "inventoryRation");
    if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

    const body = createSchema.parse(await request.json());
    const warehouse = body.warehouseId
      ? await prisma.warehouse.findFirst({ where: { id: body.warehouseId, cafeId } })
      : await getOrCreatePrimaryWarehouse(cafeId);
    if (!warehouse) return NextResponse.json({ error: "Ombor topilmadi" }, { status: 404 });

    const movement = await createStockMovement({
      cafeId,
      warehouseId: warehouse.id,
      rawMaterialId: body.rawMaterialId,
      movementType: body.movementType,
      unit: body.unit,
      qty: body.qty,
      lotId: body.lotId ?? null,
      unitCostTiyin: body.unitCostTiyin ?? null,
      note: body.note ?? null,
      actorUserId: access.session.userId,
    });

    return NextResponse.json({ movement }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }
}


import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeInventory } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import { getOrCreatePrimaryWarehouse, getMaterialBalanceBase } from "@/lib/warehouse";

const lineSchema = z.object({
  rawMaterialId: z.string(),
  countedQtyBase: z.number().int().min(0),
  note: z.string().optional(),
});

const createSchema = z.object({
  title: z.string().min(1),
  warehouseId: z.string().optional(),
  lines: z.array(lineSchema).min(1),
  note: z.string().optional(),
});

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

    const session = await prisma.inventoryCountSession.create({
      data: {
        cafeId,
        warehouseId: warehouse.id,
        title: body.title,
        status: "SUBMITTED",
        startedAt: new Date(),
        submittedAt: new Date(),
        createdBy: access.session.userId,
        note: body.note ?? null,
      },
    });

    for (const line of body.lines) {
      const expectedQtyBase = await getMaterialBalanceBase(cafeId, line.rawMaterialId, warehouse.id);
      await prisma.inventoryCountLine.create({
        data: {
          cafeId,
          sessionId: session.id,
          warehouseId: warehouse.id,
          rawMaterialId: line.rawMaterialId,
          expectedQtyBase,
          countedQtyBase: line.countedQtyBase,
          varianceQtyBase: line.countedQtyBase - expectedQtyBase,
          note: line.note ?? null,
        },
      });
    }

    return NextResponse.json({ sessionId: session.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Inventarizatsiya ma'lumotlari noto'g'ri" }, { status: 400 });
  }
}


import { NextRequest, NextResponse } from "next/server";
import { UnitCode, WarehouseMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import { createStockMovement } from "@/lib/warehouse";

function adjustUnit(baseUnit: UnitCode): UnitCode {
  if (baseUnit === UnitCode.KG) return UnitCode.G;
  if (baseUnit === UnitCode.L) return UnitCode.ML;
  return baseUnit;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string; sessionId: string }> },
) {
  try {
    const { cafeId, sessionId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;
    const feature = await checkPlanFeature(cafeId, "inventoryRation");
    if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

    const session = await prisma.inventoryCountSession.findFirst({
      where: { id: sessionId, cafeId },
      include: {
        lines: {
          include: { rawMaterial: { select: { id: true, baseUnit: true, name: true } } },
        },
      },
    });
    if (!session) {
      return NextResponse.json({ error: "Session topilmadi" }, { status: 404 });
    }
    if (session.status === "APPROVED") {
      return NextResponse.json({ error: "Allaqachon tasdiqlangan" }, { status: 400 });
    }
    if (session.status === "CANCELLED") {
      return NextResponse.json({ error: "Bekor qilingan session" }, { status: 400 });
    }

    let adjusted = 0;
    for (const line of session.lines) {
      const variance = line.varianceQtyBase;
      if (variance === 0) continue;
      const unit = adjustUnit(line.rawMaterial.baseUnit);
      await createStockMovement({
        cafeId,
        warehouseId: session.warehouseId,
        rawMaterialId: line.rawMaterialId,
        movementType: WarehouseMovementType.ADJUST,
        direction: variance > 0 ? "IN" : "OUT",
        unit,
        qty: Math.abs(variance),
        refType: "INVENTORY_COUNT",
        refId: session.id,
        note: `Inventarizatsiya: ${line.rawMaterial.name}`,
        actorUserId: access.session.userId,
      });
      adjusted++;
    }

    await prisma.inventoryCountSession.update({
      where: { id: session.id },
      data: { status: "APPROVED", approvedAt: new Date() },
    });

    return NextResponse.json({ ok: true, adjusted });
  } catch (e) {
    console.error("count approve:", e);
    return NextResponse.json({ error: "Tasdiqlashda xatolik" }, { status: 400 });
  }
}

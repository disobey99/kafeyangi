import { NextRequest, NextResponse } from "next/server";
import { UnitCode, WarehouseMovementType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import { createStockMovement, getMaterialBalanceBase } from "@/lib/warehouse";

const schema = z.object({
  fromWarehouseId: z.string(),
  toWarehouseId: z.string(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        rawMaterialId: z.string(),
        unit: z.nativeEnum(UnitCode),
        qty: z.number().int().positive(),
        fromLotId: z.string().nullable().optional(),
      }),
    )
    .min(1),
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

  const transfers = await prisma.stockTransfer.findMany({
    where: { cafeId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      fromWarehouse: { select: { name: true } },
      toWarehouse: { select: { name: true } },
      items: {
        include: { rawMaterial: { select: { name: true } } },
      },
    },
  });
  return NextResponse.json({ transfers });
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

    const body = schema.parse(await request.json());
    if (body.fromWarehouseId === body.toWarehouseId) {
      return NextResponse.json({ error: "Omborlar bir xil bo'lmasligi kerak" }, { status: 400 });
    }

    const [fromWh, toWh] = await Promise.all([
      prisma.warehouse.findFirst({ where: { id: body.fromWarehouseId, cafeId } }),
      prisma.warehouse.findFirst({ where: { id: body.toWarehouseId, cafeId } }),
    ]);
    if (!fromWh || !toWh) {
      return NextResponse.json({ error: "Ombor topilmadi" }, { status: 404 });
    }

    for (const item of body.items) {
      const balance = await getMaterialBalanceBase(
        cafeId,
        item.rawMaterialId,
        body.fromWarehouseId,
      );
      const qtyBase =
        item.unit === UnitCode.KG || item.unit === UnitCode.L ? item.qty * 1000 : item.qty;
      if (balance < qtyBase) {
        return NextResponse.json(
          { error: "Yetarli qoldiq yo'q — transfer bekor" },
          { status: 400 },
        );
      }
    }

    const transfer = await prisma.stockTransfer.create({
      data: {
        cafeId,
        transferNo: `TR-${Date.now()}`,
        fromWarehouseId: body.fromWarehouseId,
        toWarehouseId: body.toWarehouseId,
        note: body.note ?? null,
        status: "RECEIVED",
        createdBy: access.session.userId,
        approvedBy: access.session.userId,
      },
    });

    for (const item of body.items) {
      const qtyBase =
        item.unit === UnitCode.KG || item.unit === UnitCode.L ? item.qty * 1000 : item.qty;

      let fromLotId = item.fromLotId ?? null;
      if (!fromLotId) {
        const lot = await prisma.materialLot.findFirst({
          where: {
            cafeId,
            warehouseId: body.fromWarehouseId,
            rawMaterialId: item.rawMaterialId,
            qtyBase: { gt: 0 },
          },
          orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
        });
        fromLotId = lot?.id ?? null;
      }

      const fromLot = fromLotId
        ? await prisma.materialLot.findUnique({ where: { id: fromLotId } })
        : null;

      const toLot = await prisma.materialLot.create({
        data: {
          cafeId,
          warehouseId: body.toWarehouseId,
          rawMaterialId: item.rawMaterialId,
          lotCode: `TR-${transfer.id.slice(-6)}-${item.rawMaterialId.slice(-4)}-${Date.now()}`,
          expiresAt: fromLot?.expiresAt ?? null,
          unitCostTiyinBase: fromLot?.unitCostTiyinBase ?? 0,
          qtyBase: 0,
          initialQtyBase: qtyBase,
          supplierId: fromLot?.supplierId ?? null,
        },
      });

      await prisma.stockTransferItem.create({
        data: {
          cafeId,
          transferId: transfer.id,
          rawMaterialId: item.rawMaterialId,
          unit: item.unit,
          qty: item.qty,
          qtyBase,
          fromLotId,
          toLotId: toLot.id,
        },
      });

      await createStockMovement({
        cafeId,
        warehouseId: body.fromWarehouseId,
        rawMaterialId: item.rawMaterialId,
        movementType: WarehouseMovementType.TRANSFER_OUT,
        unit: item.unit,
        qty: item.qty,
        lotId: fromLotId,
        refType: "TRANSFER",
        refId: transfer.id,
        note: body.note ?? null,
        actorUserId: access.session.userId,
      });

      await createStockMovement({
        cafeId,
        warehouseId: body.toWarehouseId,
        rawMaterialId: item.rawMaterialId,
        movementType: WarehouseMovementType.TRANSFER_IN,
        unit: item.unit,
        qty: item.qty,
        lotId: toLot.id,
        refType: "TRANSFER",
        refId: transfer.id,
        note: body.note ?? null,
        actorUserId: access.session.userId,
      });
    }

    return NextResponse.json({ transferId: transfer.id }, { status: 201 });
  } catch (e) {
    console.error("transfer:", e);
    return NextResponse.json({ error: "Transfer ma'lumotlari noto'g'ri" }, { status: 400 });
  }
}

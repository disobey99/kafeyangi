import { NextRequest, NextResponse } from "next/server";
import { UnitCode, WarehouseMovementType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeInventory } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import {
  createStockMovement,
  getMaterialBalanceBase,
  toQtyBase,
} from "@/lib/warehouse";

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
  const access = await requireCafeInventory(cafeId);
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
    const access = await requireCafeInventory(cafeId);
    if (!access.ok) return access.response;
    const feature = await checkPlanFeature(cafeId, "inventoryRation");
    if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

    const body = schema.parse(await request.json());
    if (body.fromWarehouseId === body.toWarehouseId) {
      return NextResponse.json(
        { error: "Omborlar bir xil bo'lmasligi kerak" },
        { status: 400 },
      );
    }

    const [fromWh, toWh] = await Promise.all([
      prisma.warehouse.findFirst({
        where: { id: body.fromWarehouseId, cafeId },
      }),
      prisma.warehouse.findFirst({
        where: { id: body.toWarehouseId, cafeId },
      }),
    ]);
    if (!fromWh || !toWh) {
      return NextResponse.json({ error: "Ombor topilmadi" }, { status: 404 });
    }

    const transferId = await prisma.$transaction(async (tx) => {
      for (const item of body.items) {
        const qtyBase = toQtyBase(item.unit, item.qty);
        const balance = await getMaterialBalanceBase(
          cafeId,
          item.rawMaterialId,
          body.fromWarehouseId,
          tx,
        );
        if (balance < qtyBase) {
          throw new Error("Yetarli qoldiq yo'q — transfer bekor");
        }
      }

      const transfer = await tx.stockTransfer.create({
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
        const qtyBase = toQtyBase(item.unit, item.qty);

        let fromLotId = item.fromLotId ?? null;
        if (!fromLotId) {
          const lot = await tx.materialLot.findFirst({
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
          ? await tx.materialLot.findUnique({ where: { id: fromLotId } })
          : null;

        const toLot = await tx.materialLot.create({
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

        await tx.stockTransferItem.create({
          data: {
            cafeId,
            transferId: transfer.id,
            rawMaterialId: item.rawMaterialId,
            unit: item.unit,
            qty: Math.round(item.qty),
            qtyBase,
            fromLotId,
            toLotId: toLot.id,
          },
        });

        await createStockMovement({
          tx,
          cafeId,
          warehouseId: body.fromWarehouseId,
          rawMaterialId: item.rawMaterialId,
          movementType: WarehouseMovementType.TRANSFER_OUT,
          unit: item.unit,
          qty: item.qty,
          lotId: fromLotId,
          consumeFefo: !fromLotId,
          refType: "TRANSFER",
          refId: transfer.id,
          note: body.note ?? null,
          actorUserId: access.session.userId,
        });

        await createStockMovement({
          tx,
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

      return transfer.id;
    });

    return NextResponse.json({ transferId }, { status: 201 });
  } catch (e) {
    console.error("transfer:", e);
    const msg = e instanceof Error ? e.message : "Transfer ma'lumotlari noto'g'ri";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

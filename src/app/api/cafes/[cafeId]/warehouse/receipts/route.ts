import { NextRequest, NextResponse } from "next/server";
import { UnitCode, WarehouseMovementType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeInventory } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import {
  createStockMovement,
  getOrCreatePrimaryWarehouse,
  repairDoubledLots,
  toQtyBase,
} from "@/lib/warehouse";

const schema = z.object({
  supplierId: z.string().nullable().optional(),
  warehouseId: z.string().optional(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        rawMaterialId: z.string(),
        unit: z.nativeEnum(UnitCode),
        qty: z.number().int().positive(),
        unitCostTiyin: z.number().int().min(0),
        lotCode: z.string().optional(),
        expiresAt: z.string().datetime().optional(),
      }),
    )
    .min(1),
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

    const body = schema.parse(await request.json());
    const warehouse = body.warehouseId
      ? await prisma.warehouse.findFirst({
          where: { id: body.warehouseId, cafeId },
        })
      : await getOrCreatePrimaryWarehouse(cafeId);
    if (!warehouse) {
      return NextResponse.json({ error: "Ombor topilmadi" }, { status: 404 });
    }

    await repairDoubledLots(cafeId).catch(() => {});

    const receiptNo = `RCPT-${Date.now()}`;

    const receiptId = await prisma.$transaction(async (tx) => {
      const receipt = await tx.goodsReceipt.create({
        data: {
          cafeId,
          warehouseId: warehouse.id,
          supplierId: body.supplierId ?? null,
          receiptNo,
          note: body.note ?? null,
          createdBy: access.session.userId,
        },
      });

      for (const item of body.items) {
        const qtyBase = toQtyBase(item.unit, item.qty);
        const lotCode =
          item.lotCode?.trim() || `${item.rawMaterialId.slice(-6)}-${Date.now()}`;

        // qtyBase=0 — miqdor createStockMovement orqali qo‘shiladi (double-count yo‘q)
        const lot = await tx.materialLot.create({
          data: {
            cafeId,
            warehouseId: warehouse.id,
            rawMaterialId: item.rawMaterialId,
            lotCode,
            expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
            unitCostTiyinBase: item.unitCostTiyin,
            qtyBase: 0,
            initialQtyBase: qtyBase,
            supplierId: body.supplierId ?? null,
            goodsReceiptId: receipt.id,
          },
        });

        await tx.goodsReceiptItem.create({
          data: {
            cafeId,
            goodsReceiptId: receipt.id,
            rawMaterialId: item.rawMaterialId,
            unit: item.unit,
            qty: Math.round(item.qty),
            qtyBase,
            unitCostTiyin: item.unitCostTiyin,
            lotCode,
            expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
          },
        });

        await createStockMovement({
          tx,
          cafeId,
          warehouseId: warehouse.id,
          rawMaterialId: item.rawMaterialId,
          movementType: WarehouseMovementType.RECEIPT,
          unit: item.unit,
          qty: item.qty,
          lotId: lot.id,
          unitCostTiyin: item.unitCostTiyin,
          refType: "GOODS_RECEIPT",
          refId: receipt.id,
          note: body.note ?? null,
          actorUserId: access.session.userId,
        });
      }

      return receipt.id;
    });

    return NextResponse.json({ receiptId, receiptNo }, { status: 201 });
  } catch (e) {
    console.error("[warehouse/receipts]", e);
    const msg = e instanceof Error ? e.message : "Kirim ma'lumotlari noto'g'ri";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

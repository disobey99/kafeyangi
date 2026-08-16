import { UnitCode, WarehouseMovementType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toQtyBase } from "@/lib/warehouse-units";

export { formatQtyBase, fromQtyBase, toQtyBase } from "@/lib/warehouse-units";

type Tx = Prisma.TransactionClient;

const MASS_UNITS = new Set<UnitCode>([UnitCode.KG, UnitCode.G]);
const VOLUME_UNITS = new Set<UnitCode>([UnitCode.L, UnitCode.ML]);

export async function convertBetweenUnits(
  cafeId: string,
  rawMaterialId: string,
  fromUnit: UnitCode,
  toUnit: UnitCode,
  qty: number,
): Promise<number> {
  if (fromUnit === toUnit) return qty;

  if (
    (MASS_UNITS.has(fromUnit) && MASS_UNITS.has(toUnit)) ||
    (VOLUME_UNITS.has(fromUnit) && VOLUME_UNITS.has(toUnit))
  ) {
    const base = toQtyBase(fromUnit, qty);
    return toUnit === UnitCode.KG || toUnit === UnitCode.L ? base / 1000 : base;
  }

  const conversion = await prisma.unitConversion.findUnique({
    where: {
      rawMaterialId_fromUnit_toUnit: { rawMaterialId, fromUnit, toUnit },
    },
  });
  if (!conversion) {
    throw new Error(`Birlik konvertatsiyasi topilmadi: ${fromUnit} -> ${toUnit}`);
  }
  return Math.round(qty * conversion.multiplier);
}

export async function getOrCreatePrimaryWarehouse(cafeId: string) {
  const existing = await prisma.warehouse.findFirst({
    where: { cafeId, isPrimary: true },
  });
  if (existing) return existing;

  return prisma.warehouse.create({
    data: {
      cafeId,
      name: "Asosiy ombor",
      code: "MAIN",
      isPrimary: true,
      isActive: true,
    },
  });
}

export async function getMaterialBalanceBase(
  cafeId: string,
  rawMaterialId: string,
  warehouseId?: string,
  tx?: Tx,
) {
  const db = tx ?? prisma;
  const rows = await db.stockMovement.findMany({
    where: {
      cafeId,
      rawMaterialId,
      ...(warehouseId ? { warehouseId } : {}),
    },
    select: { direction: true, qtyBase: true },
  });
  return rows.reduce((sum, row) => {
    return row.direction === "IN" ? sum + row.qtyBase : sum - row.qtyBase;
  }, 0);
}

type MovementInput = {
  cafeId: string;
  warehouseId: string;
  rawMaterialId: string;
  unit: UnitCode;
  qty: number;
  lotId?: string | null;
  productId?: string | null;
  unitCostTiyin?: number | null;
  movementType: WarehouseMovementType;
  direction?: "IN" | "OUT";
  refType?: string | null;
  refId?: string | null;
  note?: string | null;
  actorUserId?: string | null;
  /** Lot allaqachon to‘g‘ri qiymatda — qayta oshirmaslik (eski) */
  skipLotUpdate?: boolean;
  /** FEFO: lotId bo‘lmasa OUT da partiyalardan yechadi */
  consumeFefo?: boolean;
  tx?: Tx;
};

async function consumeLotsFefo(
  tx: Tx,
  opts: {
    cafeId: string;
    warehouseId: string;
    rawMaterialId: string;
    qtyBase: number;
  },
) {
  let left = opts.qtyBase;
  const lots = await tx.materialLot.findMany({
    where: {
      cafeId: opts.cafeId,
      warehouseId: opts.warehouseId,
      rawMaterialId: opts.rawMaterialId,
      qtyBase: { gt: 0 },
    },
    orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
  });
  // Lot yo‘q — faqat harakatlar balansi (allaqachon tekshirilgan)
  if (lots.length === 0) return;

  for (const lot of lots) {
    if (left <= 0) break;
    const take = Math.min(lot.qtyBase, left);
    await tx.materialLot.update({
      where: { id: lot.id },
      data: { qtyBase: lot.qtyBase - take },
    });
    left -= take;
  }
  if (left > 0) {
    throw new Error("Partiya qoldig‘i yetarli emas");
  }
}

export async function createStockMovement(input: MovementInput) {
  const direction =
    input.direction ??
    (input.movementType === WarehouseMovementType.RECEIPT ||
    input.movementType === WarehouseMovementType.TRANSFER_IN ||
    input.movementType === WarehouseMovementType.INIT
      ? "IN"
      : "OUT");

  const qtyBase = toQtyBase(input.unit, input.qty);
  if (qtyBase <= 0) throw new Error("Miqdor 0 dan katta bo‘lsin");

  const run = async (tx: Tx) => {
    if (direction === "OUT") {
      const balance = await getMaterialBalanceBase(
        input.cafeId,
        input.rawMaterialId,
        input.warehouseId,
        tx,
      );
      if (balance < qtyBase) {
        throw new Error(
          `Ombor qoldig‘i yetarli emas (bor: ${balance}, kerak: ${qtyBase})`,
        );
      }
    }

    const movement = await tx.stockMovement.create({
      data: {
        cafeId: input.cafeId,
        warehouseId: input.warehouseId,
        rawMaterialId: input.rawMaterialId,
        productId: input.productId ?? null,
        movementType: input.movementType,
        direction,
        unit: input.unit,
        qty: input.qty,
        qtyBase,
        lotId: input.lotId ?? null,
        unitCostTiyin: input.unitCostTiyin ?? null,
        refType: input.refType ?? null,
        refId: input.refId ?? null,
        note: input.note ?? null,
        actorUserId: input.actorUserId ?? null,
      },
    });

    if (!input.skipLotUpdate) {
      if (input.lotId) {
        const lot = await tx.materialLot.findUnique({
          where: { id: input.lotId },
          select: { qtyBase: true },
        });
        if (lot) {
          const next =
            direction === "IN" ? lot.qtyBase + qtyBase : lot.qtyBase - qtyBase;
          if (next < 0) throw new Error("Partiya qoldig‘i yetarli emas");
          await tx.materialLot.update({
            where: { id: input.lotId },
            data: { qtyBase: next },
          });
        }
      } else if (direction === "OUT" && input.consumeFefo !== false) {
        await consumeLotsFefo(tx, {
          cafeId: input.cafeId,
          warehouseId: input.warehouseId,
          rawMaterialId: input.rawMaterialId,
          qtyBase,
        });
      }
    }

    await tx.inventoryAuditLog.create({
      data: {
        cafeId: input.cafeId,
        warehouseId: input.warehouseId,
        entityType: "StockMovement",
        entityId: movement.id,
        action: input.movementType,
        reason: input.note ?? null,
        afterJson: JSON.stringify(movement),
        actorUserId: input.actorUserId ?? null,
      },
    });

    return movement;
  };

  if (input.tx) return run(input.tx);
  return prisma.$transaction(run);
}

/** Eski double-count lotlarni bir marta tuzatish */
export async function repairDoubledLots(cafeId: string) {
  await prisma.$executeRaw`
    UPDATE "MaterialLot"
    SET "qtyBase" = "initialQtyBase"
    WHERE "cafeId" = ${cafeId}
      AND "initialQtyBase" > 0
      AND "qtyBase" = "initialQtyBase" * 2
  `;
}

export async function getLowStockAlerts(cafeId: string) {
  const materials = await prisma.rawMaterial.findMany({
    where: { cafeId, isActive: true, minQtyBase: { not: null } },
    select: { id: true, name: true, minQtyBase: true, baseUnit: true },
  });

  const alerts: Array<{
    rawMaterialId: string;
    name: string;
    minQtyBase: number;
    currentQtyBase: number;
    baseUnit: UnitCode;
  }> = [];
  for (const material of materials) {
    const currentQtyBase = await getMaterialBalanceBase(cafeId, material.id);
    if (material.minQtyBase != null && currentQtyBase <= material.minQtyBase) {
      alerts.push({
        rawMaterialId: material.id,
        name: material.name,
        minQtyBase: material.minQtyBase,
        currentQtyBase,
        baseUnit: material.baseUnit,
      });
    }
  }
  return alerts;
}

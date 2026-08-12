import { UnitCode, WarehouseMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MASS_UNITS = new Set<UnitCode>([UnitCode.KG, UnitCode.G]);
const VOLUME_UNITS = new Set<UnitCode>([UnitCode.L, UnitCode.ML]);

function normalizeQtyToBase(unit: UnitCode, qty: number): number {
  if (unit === UnitCode.KG || unit === UnitCode.L) return qty * 1000;
  return qty;
}

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
    const base = normalizeQtyToBase(fromUnit, qty);
    return toUnit === UnitCode.KG || toUnit === UnitCode.L ? base / 1000 : base;
  }

  const conversion = await prisma.unitConversion.findUnique({
    where: { rawMaterialId_fromUnit_toUnit: { rawMaterialId, fromUnit, toUnit } },
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
  /** ADJUST uchun: IN = orttirish, OUT = kamaytirish */
  direction?: "IN" | "OUT";
  refType?: string | null;
  refId?: string | null;
  note?: string | null;
  actorUserId?: string | null;
};

export async function createStockMovement(input: MovementInput) {
  const direction =
    input.direction ??
    (input.movementType === WarehouseMovementType.RECEIPT ||
    input.movementType === WarehouseMovementType.TRANSFER_IN ||
    input.movementType === WarehouseMovementType.INIT
      ? "IN"
      : "OUT");

  const qtyBase = normalizeQtyToBase(input.unit, input.qty);

  return prisma.$transaction(async (tx) => {
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

    if (input.lotId) {
      const lot = await tx.materialLot.findUnique({
        where: { id: input.lotId },
        select: { qtyBase: true },
      });
      if (lot) {
        const next = direction === "IN" ? lot.qtyBase + qtyBase : lot.qtyBase - qtyBase;
        await tx.materialLot.update({
          where: { id: input.lotId },
          data: { qtyBase: Math.max(0, next) },
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
  });
}

export async function getMaterialBalanceBase(cafeId: string, rawMaterialId: string, warehouseId?: string) {
  const rows = await prisma.stockMovement.findMany({
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

export async function getLowStockAlerts(cafeId: string) {
  const materials = await prisma.rawMaterial.findMany({
    where: { cafeId, isActive: true, minQtyBase: { not: null } },
    select: { id: true, name: true, minQtyBase: true, baseUnit: true },
  });

  const alerts: Array<{ rawMaterialId: string; name: string; minQtyBase: number; currentQtyBase: number; baseUnit: UnitCode }> = [];
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


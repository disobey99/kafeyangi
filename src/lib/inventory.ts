import { prisma } from "@/lib/prisma";
import { UnitCode, WarehouseMovementType } from "@prisma/client";
import {
  createStockMovement,
  getOrCreatePrimaryWarehouse,
} from "@/lib/warehouse";

export async function decrementStockForOrder(
  items: { productId: string; quantity: number }[],
) {
  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { trackStock: true, stockQty: true, isAvailable: true },
    });
    if (!product?.trackStock || product.stockQty == null) continue;

    const nextQty = product.stockQty - item.quantity;
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        stockQty: Math.max(0, nextQty),
        isAvailable: nextQty > 0,
      },
    });
  }
}

export function checkStockAvailable(
  items: { productId: string; quantity: number }[],
  productMap: Map<
    string,
    { trackStock: boolean; stockQty: number | null; name: string }
  >,
): string | null {
  for (const item of items) {
    const p = productMap.get(item.productId);
    if (!p?.trackStock || p.stockQty == null) continue;
    if (item.quantity > p.stockQty) {
      return `"${p.name}" qoldig'i yetarli emas (${p.stockQty} ta qoldi)`;
    }
  }
  return null;
}

export async function consumeRawMaterialsForOrder(
  cafeId: string,
  items: { productId: string; quantity: number }[],
  actorUserId?: string | null,
) {
  const productIds = items.map((i) => i.productId);
  if (!productIds.length) return;

  const recipes = await prisma.recipe.findMany({
    where: { cafeId, productId: { in: productIds }, isActive: true },
    include: { items: true },
  });
  if (!recipes.length) return;

  const byProduct = new Map(recipes.map((r) => [r.productId, r]));
  const warehouse = await getOrCreatePrimaryWarehouse(cafeId);

  await prisma.$transaction(async (tx) => {
    for (const ordered of items) {
      const recipe = byProduct.get(ordered.productId);
      if (!recipe) continue;

      for (const recipeItem of recipe.items) {
        const wastage = 1 + (recipeItem.wastagePct ?? 0) / 100;
        const totalQtyBase = Math.ceil(
          recipeItem.qtyBase * ordered.quantity * wastage,
        );
        if (totalQtyBase <= 0) continue;

        // Harakat qty Int — KG/L o‘rniga G/ML (base) yozamiz
        let unit = recipeItem.unit;
        let qty = totalQtyBase;
        if (unit === UnitCode.KG) unit = UnitCode.G;
        else if (unit === UnitCode.L) unit = UnitCode.ML;
        else qty = Math.max(1, totalQtyBase);

        await createStockMovement({
          tx,
          cafeId,
          warehouseId: warehouse.id,
          rawMaterialId: recipeItem.rawMaterialId,
          productId: ordered.productId,
          movementType: WarehouseMovementType.ORDER_CONSUMPTION,
          unit,
          qty,
          consumeFefo: true,
          refType: "ORDER",
          note: "Buyurtma bo'yicha avtomatik yechildi",
          actorUserId: actorUserId ?? null,
        });
      }
    }
  });
}

import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ShopStockMoveType =
  | "IN"
  | "OUT"
  | "ADJUST"
  | "SALE"
  | "REFUND";

type Tx = Prisma.TransactionClient;

export async function ensureShopStockTables() {
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "ShopStockMoveType" AS ENUM ('IN', 'OUT', 'ADJUST', 'SALE', 'REFUND');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ShopProduct"
    ADD COLUMN IF NOT EXISTS "lowStockAt" INTEGER NOT NULL DEFAULT 5
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ShopOrder"
    ADD COLUMN IF NOT EXISTS "stockRestored" BOOLEAN NOT NULL DEFAULT false
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ShopStockMovement" (
      "id" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "type" "ShopStockMoveType" NOT NULL,
      "qty" INTEGER NOT NULL,
      "delta" INTEGER NOT NULL,
      "balanceAfter" INTEGER NOT NULL,
      "note" TEXT,
      "orderId" TEXT,
      "actorUserId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ShopStockMovement_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ShopStockMovement_productId_createdAt_idx"
    ON "ShopStockMovement"("productId", "createdAt")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ShopStockMovement_type_createdAt_idx"
    ON "ShopStockMovement"("type", "createdAt")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ShopStockMovement_orderId_idx"
    ON "ShopStockMovement"("orderId")
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "ShopStockMovement"
        ADD CONSTRAINT "ShopStockMovement_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
}

function cuidLike() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

async function writeMovement(
  tx: Tx,
  opts: {
    productId: string;
    type: ShopStockMoveType;
    qty: number;
    delta: number;
    balanceAfter: number;
    note?: string | null;
    orderId?: string | null;
    actorUserId?: string | null;
  },
) {
  const id = cuidLike();
  try {
    await tx.shopStockMovement.create({
      data: {
        id,
        productId: opts.productId,
        type: opts.type,
        qty: opts.qty,
        delta: opts.delta,
        balanceAfter: opts.balanceAfter,
        note: opts.note?.trim() || null,
        orderId: opts.orderId ?? null,
        actorUserId: opts.actorUserId ?? null,
      },
    });
  } catch {
    await tx.$executeRaw`
      INSERT INTO "ShopStockMovement"
        ("id","productId","type","qty","delta","balanceAfter","note","orderId","actorUserId","createdAt")
      VALUES (
        ${id},
        ${opts.productId},
        CAST(${opts.type} AS "ShopStockMoveType"),
        ${opts.qty},
        ${opts.delta},
        ${opts.balanceAfter},
        ${opts.note?.trim() || null},
        ${opts.orderId ?? null},
        ${opts.actorUserId ?? null},
        ${new Date()}
      )
    `;
  }
}

/** Kirim / chiqim / to‘g‘rilash (delta) — bitta tranzaksiya */
export async function applyShopStockChange(opts: {
  productId: string;
  type: Exclude<ShopStockMoveType, "SALE" | "REFUND"> | "SALE" | "REFUND";
  /** IN/OUT/SALE/REFUND: musbat miqdor; ADJUST: yangi stock qiymati */
  qty: number;
  note?: string | null;
  orderId?: string | null;
  actorUserId?: string | null;
  tx?: Tx;
}) {
  const run = async (tx: Tx) => {
    const product = await tx.shopProduct.findUnique({
      where: { id: opts.productId },
      select: { id: true, name: true, stock: true },
    });
    if (!product) throw new Error("Mahsulot topilmadi");

    let delta = 0;
    let qty = Math.abs(Math.floor(opts.qty));
    let balanceAfter = product.stock;

    if (opts.type === "ADJUST") {
      const target = Math.max(0, Math.floor(opts.qty));
      delta = target - product.stock;
      qty = Math.abs(delta);
      balanceAfter = target;
    } else if (opts.type === "IN" || opts.type === "REFUND") {
      if (qty <= 0) throw new Error("Miqdor 0 dan katta bo‘lsin");
      delta = qty;
      balanceAfter = product.stock + qty;
    } else if (opts.type === "OUT" || opts.type === "SALE") {
      if (qty <= 0) throw new Error("Miqdor 0 dan katta bo‘lsin");
      if (product.stock < qty) {
        throw new Error(
          `"${product.name}" omborda yetarli emas (bor: ${product.stock})`,
        );
      }
      delta = -qty;
      balanceAfter = product.stock - qty;
    }

    if (opts.type === "SALE" || opts.type === "OUT") {
      const updated = await tx.shopProduct.updateMany({
        where: { id: opts.productId, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });
      if (updated.count === 0) {
        throw new Error(
          `"${product.name}" omborda yetarli emas (bor: ${product.stock})`,
        );
      }
      const fresh = await tx.shopProduct.findUnique({
        where: { id: opts.productId },
        select: { stock: true },
      });
      balanceAfter = fresh?.stock ?? balanceAfter;
    } else if (opts.type === "ADJUST") {
      await tx.shopProduct.update({
        where: { id: opts.productId },
        data: { stock: balanceAfter },
      });
    } else {
      await tx.shopProduct.update({
        where: { id: opts.productId },
        data: { stock: { increment: qty } },
      });
      const fresh = await tx.shopProduct.findUnique({
        where: { id: opts.productId },
        select: { stock: true },
      });
      balanceAfter = fresh?.stock ?? balanceAfter;
    }

    if (qty > 0 || opts.type === "ADJUST") {
      await writeMovement(tx, {
        productId: opts.productId,
        type: opts.type,
        qty: opts.type === "ADJUST" ? Math.abs(delta) : qty,
        delta,
        balanceAfter,
        note: opts.note,
        orderId: opts.orderId,
        actorUserId: opts.actorUserId,
      });
    }

    return { stock: balanceAfter, delta };
  };

  if (opts.tx) return run(opts.tx);
  return prisma.$transaction(run);
}

/** Buyurtma bekor — bir marta qaytarish */
export async function restoreShopOrderStock(
  orderId: string,
  actorUserId?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.shopOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error("Buyurtma topilmadi");
    if (order.stockRestored) return { restored: false as const };

    for (const item of order.items) {
      if (!item.productId || item.qty <= 0) continue;
      const exists = await tx.shopProduct.findUnique({
        where: { id: item.productId },
        select: { id: true },
      });
      if (!exists) continue;
      await applyShopStockChange({
        tx,
        productId: item.productId,
        type: "REFUND",
        qty: item.qty,
        note: `Buyurtma bekor #${orderId.slice(-8)}`,
        orderId,
        actorUserId,
      });
    }

    try {
      await tx.shopOrder.update({
        where: { id: orderId },
        data: { stockRestored: true },
      });
    } catch {
      await tx.$executeRaw`
        UPDATE "ShopOrder" SET "stockRestored" = true, "updatedAt" = ${new Date()}
        WHERE "id" = ${orderId}
      `;
    }

    return { restored: true as const };
  });
}

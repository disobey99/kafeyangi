import "server-only";

import { prisma } from "@/lib/prisma";

/** ShopOrder jadvallari yo‘q bo‘lsa yaratadi (db push bo‘lmasa ham). */
export async function ensureShopOrderTables() {
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "ShopOrderStatus" AS ENUM ('NEW', 'CONFIRMED', 'CANCELLED', 'DONE');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ShopOrder" (
      "id" TEXT NOT NULL,
      "customerName" TEXT NOT NULL,
      "customerPhone" TEXT NOT NULL,
      "customerNote" TEXT,
      "status" "ShopOrderStatus" NOT NULL DEFAULT 'NEW',
      "total" INTEGER NOT NULL,
      "stockRestored" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ShopOrder"
    ADD COLUMN IF NOT EXISTS "stockRestored" BOOLEAN NOT NULL DEFAULT false
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ShopOrderItem" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "productId" TEXT,
      "productName" TEXT NOT NULL,
      "unitPrice" INTEGER NOT NULL,
      "qty" INTEGER NOT NULL DEFAULT 1,
      CONSTRAINT "ShopOrderItem_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ShopOrder_status_createdAt_idx"
    ON "ShopOrder"("status", "createdAt")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ShopOrderItem_orderId_idx"
    ON "ShopOrderItem"("orderId")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ShopOrderItem_productId_idx"
    ON "ShopOrderItem"("productId")
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
}

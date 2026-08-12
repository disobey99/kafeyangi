-- AlterTable
ALTER TABLE "Cafe" ADD COLUMN "printAgentToken" TEXT;

-- AlterTable
ALTER TABLE "PrepStation" ADD COLUMN "printerHost" TEXT;

-- CreateTable
CREATE TABLE "KitchenPrintJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cafeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "prepStationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payloadJson" TEXT NOT NULL,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printedAt" DATETIME,
    CONSTRAINT "KitchenPrintJob_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KitchenPrintJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KitchenPrintJob_prepStationId_fkey" FOREIGN KEY ("prepStationId") REFERENCES "PrepStation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "KitchenPrintJob_cafeId_status_createdAt_idx" ON "KitchenPrintJob"("cafeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "KitchenPrintJob_orderId_idx" ON "KitchenPrintJob"("orderId");

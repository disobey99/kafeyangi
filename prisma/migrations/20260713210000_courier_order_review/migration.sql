-- AlterTable
ALTER TABLE "Order" ADD COLUMN "assignedCourierId" TEXT;

-- CreateIndex
CREATE INDEX "Order_assignedCourierId_idx" ON "Order"("assignedCourierId");

-- CreateIndex
CREATE INDEX "Order_cafeId_type_status_idx" ON "Order"("cafeId", "type", "status");

-- CreateTable
CREATE TABLE "OrderReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderReview_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderReview_orderId_key" ON "OrderReview"("orderId");

-- CreateIndex
CREATE INDEX "OrderReview_cafeId_createdAt_idx" ON "OrderReview"("cafeId", "createdAt");

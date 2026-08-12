-- AlterTable
ALTER TABLE "Order" ADD COLUMN "createdById" TEXT;

-- CreateIndex
CREATE INDEX "Order_createdById_idx" ON "Order"("createdById");

-- AlterTable
ALTER TABLE "Cafe" ADD COLUMN "waiterServiceFeePercent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "serviceFeeAmount" INTEGER NOT NULL DEFAULT 0;

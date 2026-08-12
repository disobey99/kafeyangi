-- AlterTable
ALTER TABLE "Notice" ADD COLUMN "audience" TEXT NOT NULL DEFAULT 'CUSTOMER';

-- CreateIndex
CREATE INDEX "Notice_cafeId_audience_createdAt_idx" ON "Notice"("cafeId", "audience", "createdAt");

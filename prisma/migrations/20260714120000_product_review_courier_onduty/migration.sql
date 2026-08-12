-- AlterTable
ALTER TABLE "CafeMember" ADD COLUMN "onDuty" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "orderId" TEXT,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id"),
    CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductReview_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProductReview_productId_score_idx" ON "ProductReview"("productId", "score");

-- CreateIndex
CREATE INDEX "ProductReview_cafeId_createdAt_idx" ON "ProductReview"("cafeId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductReview_orderId_idx" ON "ProductReview"("orderId");

-- CreateIndex
CREATE INDEX "CafeMember_cafeId_role_onDuty_idx" ON "CafeMember"("cafeId", "role", "onDuty");

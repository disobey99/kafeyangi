-- Payme, OFD, product modifiers
ALTER TABLE "Cafe" ADD COLUMN "paymeEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Cafe" ADD COLUMN "paymeMerchantId" TEXT;
ALTER TABLE "Cafe" ADD COLUMN "paymeKey" TEXT;
ALTER TABLE "Cafe" ADD COLUMN "ofdEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Cafe" ADD COLUMN "ofdTin" TEXT;
ALTER TABLE "Cafe" ADD COLUMN "ofdCompanyName" TEXT;
ALTER TABLE "Cafe" ADD COLUMN "ofdFmNumber" TEXT;

ALTER TABLE "Order" ADD COLUMN "paymeTransactionId" TEXT;
ALTER TABLE "Order" ADD COLUMN "fiscalReceiptNo" TEXT;
ALTER TABLE "Order" ADD COLUMN "fiscalQrData" TEXT;
ALTER TABLE "Order" ADD COLUMN "fiscalIssuedAt" DATETIME;

ALTER TABLE "OrderItem" ADD COLUMN "modifierSummary" TEXT;

CREATE TABLE "ProductModifierGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameRu" TEXT,
    "nameEn" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductModifierGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProductModifierGroup_productId_idx" ON "ProductModifierGroup"("productId");

CREATE TABLE "ProductModifierOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameRu" TEXT,
    "nameEn" TEXT,
    "priceDelta" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductModifierOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProductModifierGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProductModifierOption_groupId_idx" ON "ProductModifierOption"("groupId");

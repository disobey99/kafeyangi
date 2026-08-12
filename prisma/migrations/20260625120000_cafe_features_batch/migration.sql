-- Cafe settings, i18n, stock, loyalty, waiter response time
ALTER TABLE "Cafe" ADD COLUMN "customDomain" TEXT;
ALTER TABLE "Cafe" ADD COLUMN "menuPrimaryColor" TEXT;
ALTER TABLE "Cafe" ADD COLUMN "minOrderAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Cafe" ADD COLUMN "deliveryFee" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Cafe" ADD COLUMN "deliveryTimeMinutes" INTEGER NOT NULL DEFAULT 45;
ALTER TABLE "Cafe" ADD COLUMN "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Cafe" ADD COLUMN "dailyReportEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Cafe" ADD COLUMN "dailyReportHour" INTEGER NOT NULL DEFAULT 22;

CREATE UNIQUE INDEX "Cafe_customDomain_key" ON "Cafe"("customDomain");
CREATE INDEX "Cafe_customDomain_idx" ON "Cafe"("customDomain");

ALTER TABLE "Category" ADD COLUMN "nameRu" TEXT;
ALTER TABLE "Category" ADD COLUMN "nameEn" TEXT;

ALTER TABLE "Product" ADD COLUMN "nameRu" TEXT;
ALTER TABLE "Product" ADD COLUMN "nameEn" TEXT;
ALTER TABLE "Product" ADD COLUMN "descriptionRu" TEXT;
ALTER TABLE "Product" ADD COLUMN "descriptionEn" TEXT;
ALTER TABLE "Product" ADD COLUMN "trackStock" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "stockQty" INTEGER;

ALTER TABLE "WaiterCall" ADD COLUMN "respondedAt" DATETIME;
ALTER TABLE "WaiterCall" ADD COLUMN "respondedById" TEXT;

CREATE TABLE "LoyaltyCustomer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cafeId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoyaltyCustomer_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LoyaltyTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "LoyaltyCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LoyaltyCustomer_cafeId_phone_key" ON "LoyaltyCustomer"("cafeId", "phone");
CREATE INDEX "LoyaltyCustomer_cafeId_idx" ON "LoyaltyCustomer"("cafeId");
CREATE INDEX "LoyaltyTransaction_customerId_idx" ON "LoyaltyTransaction"("customerId");
CREATE INDEX "LoyaltyTransaction_orderId_idx" ON "LoyaltyTransaction"("orderId");

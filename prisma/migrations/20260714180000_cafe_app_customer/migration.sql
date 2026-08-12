-- CreateTable
CREATE TABLE "CafeAppCustomer" (
    "id" TEXT NOT NULL,
    "cafeId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT "CafeAppCustomer_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CafeAppCustomer_cafeId_idx" ON "CafeAppCustomer"("cafeId");

-- CreateIndex
CREATE UNIQUE INDEX "CafeAppCustomer_cafeId_phone_key" ON "CafeAppCustomer"("cafeId", "phone");

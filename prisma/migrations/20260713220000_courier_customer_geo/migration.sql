-- AlterTable
ALTER TABLE "Order" ADD COLUMN "customerLat" REAL;
ALTER TABLE "Order" ADD COLUMN "customerLng" REAL;

-- CreateTable
CREATE TABLE "CourierLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cafeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourierLocation_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourierLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CourierLocation_cafeId_userId_key" ON "CourierLocation"("cafeId", "userId");

-- CreateIndex
CREATE INDEX "CourierLocation_cafeId_updatedAt_idx" ON "CourierLocation"("cafeId", "updatedAt");

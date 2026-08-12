-- CreateTable
CREATE TABLE "PrepStation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cafeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrepStation_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cafeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameRu" TEXT,
    "nameEn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultPrepStationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Category_defaultPrepStationId_fkey" FOREIGN KEY ("defaultPrepStationId") REFERENCES "PrepStation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("id", "cafeId", "name", "nameRu", "nameEn", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT "id", "cafeId", "name", "nameRu", "nameEn", "sortOrder", "isActive", "createdAt", "updatedAt" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE INDEX "Category_cafeId_idx" ON "Category"("cafeId");
CREATE INDEX "Category_defaultPrepStationId_idx" ON "Category"("defaultPrepStationId");

CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cafeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameRu" TEXT,
    "nameEn" TEXT,
    "description" TEXT,
    "descriptionRu" TEXT,
    "descriptionEn" TEXT,
    "price" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "menuTag" TEXT,
    "prepStationId" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "trackStock" BOOLEAN NOT NULL DEFAULT false,
    "stockQty" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_prepStationId_fkey" FOREIGN KEY ("prepStationId") REFERENCES "PrepStation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("id", "cafeId", "categoryId", "name", "nameRu", "nameEn", "description", "descriptionRu", "descriptionEn", "price", "imageUrl", "menuTag", "isAvailable", "trackStock", "stockQty", "sortOrder", "createdAt", "updatedAt")
SELECT "id", "cafeId", "categoryId", "name", "nameRu", "nameEn", "description", "descriptionRu", "descriptionEn", "price", "imageUrl", "menuTag", "isAvailable", "trackStock", "stockQty", "sortOrder", "createdAt", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_cafeId_idx" ON "Product"("cafeId");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_prepStationId_idx" ON "Product"("prepStationId");

CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "modifierSummary" TEXT,
    "notes" TEXT,
    "isNewAddition" BOOLEAN NOT NULL DEFAULT false,
    "prepStationId" TEXT,
    "prepStationName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_prepStationId_fkey" FOREIGN KEY ("prepStationId") REFERENCES "PrepStation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("id", "orderId", "productId", "quantity", "unitPrice", "modifierSummary", "notes", "isNewAddition", "status", "createdAt")
SELECT "id", "orderId", "productId", "quantity", "unitPrice", "modifierSummary", "notes", "isNewAddition", "status", "createdAt" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_prepStationId_idx" ON "OrderItem"("prepStationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PrepStation_cafeId_idx" ON "PrepStation"("cafeId");
CREATE INDEX "PrepStation_cafeId_isActive_idx" ON "PrepStation"("cafeId", "isActive");

-- Backfill default "Oshxona" station for every cafe
INSERT INTO "PrepStation" ("id", "cafeId", "name", "sortOrder", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(12))), "id", 'Oshxona', 0, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Cafe";

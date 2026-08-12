-- Enterprise warehouse core (sqlite)

CREATE TABLE "Warehouse" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Warehouse_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Warehouse_cafeId_code_key" ON "Warehouse"("cafeId","code");
CREATE INDEX "Warehouse_cafeId_isActive_idx" ON "Warehouse"("cafeId","isActive");

CREATE TABLE "RawMaterial" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT,
  "baseUnit" TEXT NOT NULL,
  "unitKind" TEXT NOT NULL,
  "trackLots" BOOLEAN NOT NULL DEFAULT true,
  "minQtyBase" INTEGER,
  "reorderQtyBase" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "RawMaterial_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RawMaterial_cafeId_name_key" ON "RawMaterial"("cafeId","name");
CREATE INDEX "RawMaterial_cafeId_isActive_idx" ON "RawMaterial"("cafeId","isActive");

CREATE TABLE "UnitConversion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "rawMaterialId" TEXT NOT NULL,
  "fromUnit" TEXT NOT NULL,
  "toUnit" TEXT NOT NULL,
  "multiplier" REAL NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UnitConversion_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UnitConversion_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UnitConversion_rawMaterialId_fromUnit_toUnit_key" ON "UnitConversion"("rawMaterialId","fromUnit","toUnit");

CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "telegram" TEXT,
  "address" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Supplier_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Supplier_cafeId_name_key" ON "Supplier"("cafeId","name");
CREATE INDEX "Supplier_cafeId_isActive_idx" ON "Supplier"("cafeId","isActive");

CREATE TABLE "GoodsReceipt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "supplierId" TEXT,
  "receiptNo" TEXT NOT NULL,
  "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  "createdBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "GoodsReceipt_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GoodsReceipt_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GoodsReceipt_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GoodsReceipt_cafeId_receiptNo_key" ON "GoodsReceipt"("cafeId","receiptNo");
CREATE INDEX "GoodsReceipt_cafeId_receivedAt_idx" ON "GoodsReceipt"("cafeId","receivedAt");

CREATE TABLE "MaterialLot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "rawMaterialId" TEXT NOT NULL,
  "lotCode" TEXT NOT NULL,
  "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" DATETIME,
  "unitCostTiyinBase" INTEGER NOT NULL DEFAULT 0,
  "qtyBase" INTEGER NOT NULL DEFAULT 0,
  "initialQtyBase" INTEGER NOT NULL DEFAULT 0,
  "supplierId" TEXT,
  "goodsReceiptId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "MaterialLot_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MaterialLot_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MaterialLot_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MaterialLot_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MaterialLot_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MaterialLot_warehouseId_rawMaterialId_lotCode_key" ON "MaterialLot"("warehouseId","rawMaterialId","lotCode");
CREATE INDEX "MaterialLot_cafeId_warehouseId_expiresAt_idx" ON "MaterialLot"("cafeId","warehouseId","expiresAt");

CREATE TABLE "GoodsReceiptItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "goodsReceiptId" TEXT NOT NULL,
  "rawMaterialId" TEXT NOT NULL,
  "productId" TEXT,
  "unit" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "qtyBase" INTEGER NOT NULL,
  "unitCostTiyin" INTEGER NOT NULL DEFAULT 0,
  "lotCode" TEXT,
  "expiresAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoodsReceiptItem_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GoodsReceiptItem_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GoodsReceiptItem_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GoodsReceiptItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "GoodsReceiptItem_cafeId_rawMaterialId_idx" ON "GoodsReceiptItem"("cafeId","rawMaterialId");

CREATE TABLE "StockTransfer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "transferNo" TEXT NOT NULL,
  "fromWarehouseId" TEXT NOT NULL,
  "toWarehouseId" TEXT NOT NULL,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdBy" TEXT,
  "approvedBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "StockTransfer_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StockTransfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StockTransfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StockTransfer_cafeId_transferNo_key" ON "StockTransfer"("cafeId","transferNo");
CREATE INDEX "StockTransfer_cafeId_createdAt_idx" ON "StockTransfer"("cafeId","createdAt");

CREATE TABLE "StockTransferItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "transferId" TEXT NOT NULL,
  "rawMaterialId" TEXT NOT NULL,
  "productId" TEXT,
  "unit" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "qtyBase" INTEGER NOT NULL,
  "fromLotId" TEXT,
  "toLotId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockTransferItem_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StockTransferItem_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StockTransferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "StockTransferItem_cafeId_rawMaterialId_idx" ON "StockTransferItem"("cafeId","rawMaterialId");

CREATE TABLE "StockMovement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "rawMaterialId" TEXT NOT NULL,
  "productId" TEXT,
  "movementType" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "qtyBase" INTEGER NOT NULL,
  "lotId" TEXT,
  "unitCostTiyin" INTEGER,
  "refType" TEXT,
  "refId" TEXT,
  "note" TEXT,
  "actorUserId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "StockMovement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "MaterialLot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "StockMovement_cafeId_createdAt_idx" ON "StockMovement"("cafeId","createdAt");
CREATE INDEX "StockMovement_warehouseId_rawMaterialId_createdAt_idx" ON "StockMovement"("warehouseId","rawMaterialId","createdAt");

CREATE TABLE "Recipe" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "outputQty" INTEGER NOT NULL DEFAULT 1,
  "outputUnit" TEXT NOT NULL DEFAULT 'PC',
  "note" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Recipe_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Recipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Recipe_productId_key" ON "Recipe"("productId");
CREATE INDEX "Recipe_cafeId_isActive_idx" ON "Recipe"("cafeId","isActive");

CREATE TABLE "RecipeItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "rawMaterialId" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "qtyBase" INTEGER NOT NULL,
  "wastagePct" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecipeItem_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecipeItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecipeItem_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RecipeItem_recipeId_rawMaterialId_key" ON "RecipeItem"("recipeId","rawMaterialId");
CREATE INDEX "RecipeItem_cafeId_rawMaterialId_idx" ON "RecipeItem"("cafeId","rawMaterialId");

CREATE TABLE "InventoryCountSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "startedAt" DATETIME,
  "submittedAt" DATETIME,
  "approvedAt" DATETIME,
  "createdBy" TEXT,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "InventoryCountSession_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InventoryCountSession_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "InventoryCountSession_cafeId_createdAt_idx" ON "InventoryCountSession"("cafeId","createdAt");

CREATE TABLE "InventoryCountLine" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "rawMaterialId" TEXT NOT NULL,
  "productId" TEXT,
  "expectedQtyBase" INTEGER NOT NULL,
  "countedQtyBase" INTEGER NOT NULL,
  "varianceQtyBase" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryCountLine_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InventoryCountLine_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InventoryCountSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InventoryCountLine_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InventoryCountLine_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InventoryCountLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "InventoryCountLine_cafeId_rawMaterialId_idx" ON "InventoryCountLine"("cafeId","rawMaterialId");

CREATE TABLE "InventoryAuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "warehouseId" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "beforeJson" TEXT,
  "afterJson" TEXT,
  "actorUserId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryAuditLog_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InventoryAuditLog_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "InventoryAuditLog_cafeId_createdAt_idx" ON "InventoryAuditLog"("cafeId","createdAt");
CREATE INDEX "InventoryAuditLog_entityType_entityId_idx" ON "InventoryAuditLog"("entityType","entityId");


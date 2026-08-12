-- Zal sxemasi: umumiy zal, kabina, tashqari
CREATE TABLE "new_Table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cafeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "qrToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'FREE',
    "posX" INTEGER NOT NULL DEFAULT 0,
    "posY" INTEGER NOT NULL DEFAULT 0,
    "zone" TEXT NOT NULL DEFAULT 'HALL',
    "seats" INTEGER NOT NULL DEFAULT 4,
    "assignedWaiterId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Table_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Table_assignedWaiterId_fkey" FOREIGN KEY ("assignedWaiterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Table" (
    "id", "cafeId", "number", "name", "qrToken", "status", "posX", "posY", "zone", "seats",
    "assignedWaiterId", "isActive", "createdAt"
)
SELECT
    "id", "cafeId", "number", "name", "qrToken", "status", "posX", "posY", 'HALL', "seats",
    "assignedWaiterId", "isActive", "createdAt"
FROM "Table";

DROP TABLE "Table";
ALTER TABLE "new_Table" RENAME TO "Table";

CREATE UNIQUE INDEX "Table_qrToken_key" ON "Table"("qrToken");
CREATE UNIQUE INDEX "Table_cafeId_number_key" ON "Table"("cafeId", "number");
CREATE INDEX "Table_cafeId_idx" ON "Table"("cafeId");

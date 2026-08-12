-- Mijoz xodim reytingi
CREATE TABLE "StaffRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cafeId" TEXT NOT NULL,
    "memberUserId" TEXT NOT NULL,
    "tableId" TEXT,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffRating_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffRating_memberUserId_fkey" FOREIGN KEY ("memberUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffRating_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "StaffRating_cafeId_memberUserId_idx" ON "StaffRating"("cafeId", "memberUserId");
CREATE INDEX "StaffRating_tableId_idx" ON "StaffRating"("tableId");

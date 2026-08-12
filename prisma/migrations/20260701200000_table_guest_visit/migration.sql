-- CreateTable
CREATE TABLE "TableGuestVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableId" TEXT NOT NULL,
    "visitToken" TEXT NOT NULL,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TableGuestVisit_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "guestVisitId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TableGuestVisit_visitToken_key" ON "TableGuestVisit"("visitToken");
CREATE INDEX "TableGuestVisit_tableId_idx" ON "TableGuestVisit"("tableId");
CREATE INDEX "TableGuestVisit_visitToken_idx" ON "TableGuestVisit"("visitToken");
CREATE INDEX "Order_guestVisitId_idx" ON "Order"("guestVisitId");

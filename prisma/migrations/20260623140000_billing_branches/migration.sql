-- CreateTable
CREATE TABLE "CafeGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CafeGroup_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillingInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cafeId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingInvoice_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cafe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "logoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TRIAL',
    "plan" TEXT NOT NULL DEFAULT 'STARTER',
    "trialEndsAt" DATETIME,
    "subscriptionEndsAt" DATETIME,
    "telegramChatId" TEXT,
    "ownerId" TEXT NOT NULL,
    "groupId" TEXT,
    "isMainBranch" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cafe_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cafe_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CafeGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Cafe" ("id", "name", "slug", "address", "phone", "logoUrl", "status", "plan", "trialEndsAt", "subscriptionEndsAt", "telegramChatId", "ownerId", "createdAt", "updatedAt", "isMainBranch") SELECT "id", "name", "slug", "address", "phone", "logoUrl", "status", "plan", "trialEndsAt", "subscriptionEndsAt", "telegramChatId", "ownerId", "createdAt", "updatedAt", false FROM "Cafe";
DROP TABLE "Cafe";
ALTER TABLE "new_Cafe" RENAME TO "Cafe";
CREATE UNIQUE INDEX "Cafe_slug_key" ON "Cafe"("slug");
CREATE INDEX "Cafe_groupId_idx" ON "Cafe"("groupId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CafeGroup_slug_key" ON "CafeGroup"("slug");
CREATE INDEX "CafeGroup_ownerId_idx" ON "CafeGroup"("ownerId");
CREATE INDEX "BillingInvoice_cafeId_idx" ON "BillingInvoice"("cafeId");
CREATE INDEX "BillingInvoice_cafeId_status_idx" ON "BillingInvoice"("cafeId", "status");

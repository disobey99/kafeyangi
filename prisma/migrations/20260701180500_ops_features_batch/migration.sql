-- Referral
CREATE TABLE "ReferralCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralCode_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");
CREATE INDEX "ReferralCode_cafeId_idx" ON "ReferralCode"("cafeId");

CREATE TABLE "ReferralClaim" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "senderCafeId" TEXT NOT NULL,
  "receiverCafeId" TEXT NOT NULL,
  "rewardMonths" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralClaim_senderCafeId_fkey" FOREIGN KEY ("senderCafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReferralClaim_receiverCafeId_fkey" FOREIGN KEY ("receiverCafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReferralClaim_senderCafeId_receiverCafeId_key" ON "ReferralClaim"("senderCafeId", "receiverCafeId");
CREATE INDEX "ReferralClaim_receiverCafeId_idx" ON "ReferralClaim"("receiverCafeId");

-- Chat & Notices
CREATE TABLE "Notice" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "createdBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notice_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Notice_cafeId_createdAt_idx" ON "Notice"("cafeId", "createdAt");

CREATE TABLE "ChatMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "senderName" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ChatMessage_cafeId_createdAt_idx" ON "ChatMessage"("cafeId", "createdAt");

-- Shift swap
CREATE TABLE "ShiftSwapRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "requesterName" TEXT NOT NULL,
  "fromDate" DATETIME NOT NULL,
  "toDate" DATETIME NOT NULL,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "acceptedBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShiftSwapRequest_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ShiftSwapRequest_cafeId_status_idx" ON "ShiftSwapRequest"("cafeId", "status");

-- IoT Temperature
CREATE TABLE "IoTTemperatureEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "sensorName" TEXT NOT NULL,
  "temperature" REAL NOT NULL,
  "threshold" REAL NOT NULL DEFAULT 5,
  "isAlarm" BOOLEAN NOT NULL DEFAULT false,
  "payload" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IoTTemperatureEvent_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "IoTTemperatureEvent_cafeId_createdAt_idx" ON "IoTTemperatureEvent"("cafeId", "createdAt");

-- Freshness
CREATE TABLE "FreshnessItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "location" TEXT,
  "note" TEXT,
  "isExpired" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FreshnessItem_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "FreshnessItem_cafeId_expiresAt_idx" ON "FreshnessItem"("cafeId", "expiresAt");

-- Break timer
CREATE TABLE "BreakSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" DATETIME,
  "plannedMin" INTEGER NOT NULL DEFAULT 15,
  "note" TEXT,
  CONSTRAINT "BreakSession_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "BreakSession_cafeId_startedAt_idx" ON "BreakSession"("cafeId", "startedAt");

-- Cash variance
CREATE TABLE "CashVarianceReport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "cashierId" TEXT NOT NULL,
  "cashierName" TEXT NOT NULL,
  "shiftLabel" TEXT,
  "expectedCash" INTEGER NOT NULL,
  "actualCash" INTEGER NOT NULL,
  "variance" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashVarianceReport_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CashVarianceReport_cafeId_createdAt_idx" ON "CashVarianceReport"("cafeId", "createdAt");

-- Music
CREATE TABLE "MusicSchedule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "startsAt" TEXT NOT NULL,
  "endsAt" TEXT NOT NULL,
  "volume" INTEGER NOT NULL DEFAULT 70,
  "daysMask" TEXT NOT NULL DEFAULT '1234567',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MusicSchedule_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "MusicSchedule_cafeId_isActive_idx" ON "MusicSchedule"("cafeId", "isActive");

-- Blind count
CREATE TABLE "InventoryBlindCount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cafeId" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "expectedQty" INTEGER NOT NULL,
  "countedQty" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "mismatchReason" TEXT,
  "createdBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryBlindCount_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "InventoryBlindCount_cafeId_createdAt_idx" ON "InventoryBlindCount"("cafeId", "createdAt");

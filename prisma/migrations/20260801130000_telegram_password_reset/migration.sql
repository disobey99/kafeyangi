-- AlterTable
ALTER TABLE "User" ADD COLUMN "telegramChatId" TEXT;

-- AlterTable
ALTER TABLE "PasswordResetToken" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'EMAIL';

-- CreateTable
CREATE TABLE "TelegramPasswordLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelegramPasswordLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TelegramPasswordLink_userId_createdAt_idx" ON "TelegramPasswordLink"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_channel_createdAt_idx" ON "PasswordResetToken"("userId", "channel", "createdAt");

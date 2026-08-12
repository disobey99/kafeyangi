-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "replyToId" TEXT;

-- CreateTable
CREATE TABLE "ChatMessageRead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ChatMessage_replyToId_idx" ON "ChatMessage"("replyToId");

-- CreateIndex
CREATE INDEX "ChatMessageRead_messageId_idx" ON "ChatMessageRead"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessageRead_messageId_userId_key" ON "ChatMessageRead"("messageId", "userId");

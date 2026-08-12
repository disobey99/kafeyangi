-- AlterTable
ALTER TABLE "CafeMember" ADD COLUMN "pinHash" TEXT;
ALTER TABLE "CafeMember" ADD COLUMN "pinResetRequired" BOOLEAN NOT NULL DEFAULT false;

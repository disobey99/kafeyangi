-- AlterTable
ALTER TABLE "CafeMember" ADD COLUMN "webauthnCredentialId" TEXT;
ALTER TABLE "CafeMember" ADD COLUMN "webauthnPublicKey" TEXT;
ALTER TABLE "CafeMember" ADD COLUMN "webauthnCounter" INTEGER NOT NULL DEFAULT 0;

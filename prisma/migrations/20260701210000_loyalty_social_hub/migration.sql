-- AlterTable
ALTER TABLE "Cafe" ADD COLUMN "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Cafe" ADD COLUMN "loyaltyTerms" TEXT;
ALTER TABLE "Cafe" ADD COLUMN "loyaltyProgramType" TEXT NOT NULL DEFAULT 'CASHBACK';
ALTER TABLE "Cafe" ADD COLUMN "loyaltyRedeemPeriod" TEXT NOT NULL DEFAULT 'MONTH';
ALTER TABLE "Cafe" ADD COLUMN "loyaltyCashbackPercent" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Cafe" ADD COLUMN "socialInstagram" TEXT;
ALTER TABLE "Cafe" ADD COLUMN "socialTelegram" TEXT;
ALTER TABLE "Cafe" ADD COLUMN "socialFacebook" TEXT;

-- AlterTable
ALTER TABLE "LoyaltyCustomer" ADD COLUMN "cashbackBalanceTiyin" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LoyaltyCustomer" ADD COLUMN "lastCashbackRedeemAt" DATETIME;

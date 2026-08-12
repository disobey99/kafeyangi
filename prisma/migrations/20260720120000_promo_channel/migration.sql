-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'DISCOUNT';

-- Banner aksiyalar (rasm yoki slot) → BANNER
UPDATE "Promotion"
SET "channel" = 'BANNER'
WHERE ("imageUrl" IS NOT NULL AND trim("imageUrl") != '')
   OR "slot" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Promotion_cafeId_channel_idx" ON "Promotion"("cafeId", "channel");

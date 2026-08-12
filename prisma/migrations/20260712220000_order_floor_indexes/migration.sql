-- Floor / hisobot so'rovlari uchun indekslar
CREATE INDEX "Order_cafeId_paidAt_idx" ON "Order"("cafeId", "paidAt");
CREATE INDEX "Order_tableId_status_createdAt_idx" ON "Order"("tableId", "status", "createdAt");
CREATE INDEX "TableGuestVisit_tableId_endedAt_idx" ON "TableGuestVisit"("tableId", "endedAt");

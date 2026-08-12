import { prisma } from "@/lib/prisma";
import { publishCafeEvent } from "@/lib/realtime";

function padReceiptSeq(n: number) {
  return String(n).padStart(8, "0");
}

/** OFD QR matni (soddalashtirilgan — haqiqiy OFD operatoriga ulanish uchun tayyor format) */
export function buildFiscalQrPayload(opts: {
  tin: string;
  receiptNo: string;
  timestamp: Date;
  totalTiyin: number;
  fmNumber?: string | null;
}) {
  const totalSom = (opts.totalTiyin / 100).toFixed(2);
  const dt = opts.timestamp.toISOString().replace(/[-:]/g, "").slice(0, 14);
  return [
    `TIN=${opts.tin}`,
    `RN=${opts.receiptNo}`,
    `DT=${dt}`,
    `AM=${totalSom}`,
    opts.fmNumber ? `FM=${opts.fmNumber}` : null,
  ]
    .filter(Boolean)
    .join(";");
}

export async function issueFiscalReceipt(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { cafe: true, items: { include: { product: true } } },
  });

  if (!order) return { ok: false as const, error: "Buyurtma topilmadi" };
  if (!order.cafe.ofdEnabled || !order.cafe.ofdTin) {
    return { ok: false as const, error: "OFD o'chirilgan" };
  }
  if (order.fiscalReceiptNo) {
    return {
      ok: true as const,
      receiptNo: order.fiscalReceiptNo,
      qrData: order.fiscalQrData!,
    };
  }
  if (!order.paidAt) {
    return { ok: false as const, error: "Avval to'lov qilinishi kerak" };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const countToday = await prisma.order.count({
    where: {
      cafeId: order.cafeId,
      fiscalIssuedAt: { gte: todayStart },
    },
  });

  const receiptNo = `${order.cafe.ofdFmNumber ?? "FM"}-${padReceiptSeq(countToday + 1)}`;
  const qrData = buildFiscalQrPayload({
    tin: order.cafe.ofdTin,
    receiptNo,
    timestamp: new Date(),
    totalTiyin: order.totalAmount,
    fmNumber: order.cafe.ofdFmNumber,
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      fiscalReceiptNo: receiptNo,
      fiscalQrData: qrData,
      fiscalIssuedAt: new Date(),
    },
  });

  publishCafeEvent(order.cafeId, {
    type: "order.updated",
    payload: { orderId, fiscal: true },
  });

  return { ok: true as const, receiptNo, qrData };
}

export async function issueFiscalForTableOrders(cafeId: string, tableId: string) {
  const orders = await prisma.order.findMany({
    where: {
      cafeId,
      tableId,
      paidAt: { not: null },
      fiscalReceiptNo: null,
    },
  });
  const results = [];
  for (const o of orders) {
    results.push(await issueFiscalReceipt(o.id));
  }
  return results;
}

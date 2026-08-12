import { prisma } from "@/lib/prisma";
import {
  formatOrderTelegramMessage,
  sendTelegramMessage,
} from "@/lib/telegram";

/**
 * Support bot ofitsiant chaqiruvi / operatsion xabarlarni qabul qilmaydi.
 * Ofitsiant chaqiruvi — staff ilova (push / realtime).
 */
export async function notifyTelegramWaiterCall(
  _cafeId: string,
  _tableNumber: number,
) {
  return;
}

/**
 * Yangi buyurtma operatsion xabari — support botga yuborilmaydi.
 * Kerak bo'lsa alohida OPS bot tokeni bilan yoqiladi.
 */
export async function notifyTelegramNewOrder(orderId: string) {
  if (process.env.TELEGRAM_OPS_ORDERS !== "true") return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { cafe: true, table: true },
  });
  if (!order?.cafe.telegramChatId) return;

  await sendTelegramMessage(
    order.cafe.telegramChatId,
    formatOrderTelegramMessage({
      cafeName: order.cafe.name,
      orderNumber: order.orderNumber,
      tableNumber: order.table?.number,
      type: order.type,
      totalSom: Math.floor(order.totalAmount / 100),
      customerPhone: order.customerPhone ?? undefined,
      customerAddress: order.customerAddress ?? undefined,
    }),
    { bot: "support" },
  );
}

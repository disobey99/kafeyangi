import { prisma } from "@/lib/prisma";
import { computeOrderTotals } from "@/lib/waiter-service-fee";

export function orderHasWaiterServiceFee(order: {
  source: string;
  serviceMode?: string;
  createdById: string | null;
  table?: { assignedWaiterId: string | null } | null;
}): boolean {
  if (order.serviceMode === "SELF") return false;
  if (order.source === "WAITER" || order.source === "CASHIER") return true;
  if (order.source === "QR_TABLE") return Boolean(order.createdById);
  return Boolean(order.createdById) || Boolean(order.table?.assignedWaiterId);
}

export async function recalculateOrderTotals(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      cafe: { select: { waiterServiceFeePercent: true } },
      table: { select: { assignedWaiterId: true } },
    },
  });
  if (!order) return null;

  const subtotalAmount = order.items.reduce(
    (s, i) => s + i.unitPrice * i.quantity,
    0,
  );

  const hasWaiter = orderHasWaiterServiceFee(order);

  const { serviceFeeAmount, totalAmount } = computeOrderTotals({
    subtotalAmount,
    discountAmount: order.discountAmount,
    hasWaiter,
    waiterServiceFeePercent: order.cafe.waiterServiceFeePercent,
  });

  const targetCreatedById =
    order.createdById ??
    (order.source !== "QR_TABLE" ? order.table?.assignedWaiterId ?? null : null);

  return prisma.order.update({
    where: { id: orderId },
    data: {
      subtotalAmount,
      serviceFeeAmount,
      totalAmount,
      createdById: targetCreatedById,
    },
  });
}

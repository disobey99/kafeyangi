import { prisma } from "@/lib/prisma";
import { orderCreatorLabel } from "@/lib/utils";

export type ClosedTableSession = {
  id: string;
  tableNumber: number;
  closedAt: string;
  paymentMethod: string | null;
  orderCount: number;
  subtotal: number;
  discount: number;
  total: number;
  orders: {
    orderNumber: number;
    source: string;
    createdByName: string | null;
    notes: string | null;
    totalAmount: number;
    items: { quantity: number; name: string; unitPrice: number }[];
  }[];
};

export async function getClosedTableHistory(
  cafeId: string,
  options?: { tableNumber?: number; days?: number; limit?: number }
) {
  const days = options?.days ?? 1;
  const limit = options?.limit ?? 50;
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  if (days > 1) {
    since.setDate(since.getDate() - (days - 1));
  }

  const orders = await prisma.order.findMany({
    where: {
      cafeId,
      status: "DELIVERED",
      paidAt: { not: null, gte: since },
      tableId: { not: null },
      ...(options?.tableNumber != null
        ? { table: { number: options.tableNumber } }
        : {}),
    },
    include: {
      table: { select: { number: true } },
      createdBy: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { paidAt: "desc" },
    take: 200,
  });

  const sessionMap = new Map<string, ClosedTableSession>();

  for (const order of orders) {
    if (!order.table || !order.paidAt) continue;

    const key = `${order.tableId}-${order.paidAt.getTime()}`;
    let session = sessionMap.get(key);

    if (!session) {
      session = {
        id: key,
        tableNumber: order.table.number,
        closedAt: order.paidAt.toISOString(),
        paymentMethod: order.paymentMethod,
        orderCount: 0,
        subtotal: 0,
        discount: 0,
        total: 0,
        orders: [],
      };
      sessionMap.set(key, session);
    }

    session.orderCount += 1;
    session.subtotal += order.subtotalAmount;
    session.discount += order.discountAmount;
    session.total += order.totalAmount;
    session.orders.push({
      orderNumber: order.orderNumber,
      source: order.source,
      createdByName: orderCreatorLabel({
        source: order.source,
        createdBy: order.createdBy,
      }),
      notes: order.notes,
      totalAmount: order.totalAmount,
      items: order.items.map((i) => ({
        quantity: i.quantity,
        name: i.product.name,
        unitPrice: i.unitPrice,
      })),
    });
  }

  return [...sessionMap.values()]
    .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime())
    .slice(0, limit);
}

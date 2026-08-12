import { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishCafeEvent } from "@/lib/realtime";
import { orderCreatorLabel } from "@/lib/utils";
import { issueFiscalForTableOrders } from "@/lib/ofd";
import { recalculateOrderTotals } from "@/lib/order-totals";
import { endGuestVisitsForTable } from "@/lib/table-guest-visit";
import {
  applyCashbackRedeem,
  applyLoyaltyEarn,
  normalizePhone,
} from "@/lib/loyalty";

const OPEN_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "READY"] as const;

export async function getOpenTables(cafeId: string) {
  const tables = await prisma.table.findMany({
    where: { cafeId, isActive: true },
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      status: true,
      orders: {
        where: { status: { in: [...OPEN_STATUSES] } },
        select: { totalAmount: true },
      },
    },
  });

  return tables
    .filter((t) => t.orders.length > 0)
    .map((t) => ({
      id: t.id,
      number: t.number,
      status: t.status,
      orderCount: t.orders.length,
      total: t.orders.reduce((s, o) => s + o.totalAmount, 0),
    }));
}

export async function getTableBill(cafeId: string, tableNumber: number) {
  const table = await prisma.table.findUnique({
    where: { cafeId_number: { cafeId, number: tableNumber } },
    include: {
      assignedWaiter: { select: { id: true, name: true } },
    },
  });
  if (!table) return null;

  const orders = await prisma.order.findMany({
    where: {
      tableId: table.id,
      status: { in: [...OPEN_STATUSES] },
    },
    include: {
      items: { include: { product: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const subtotal = orders.reduce((s, o) => s + o.subtotalAmount, 0);
  const discount = orders.reduce((s, o) => s + o.discountAmount, 0);
  const serviceFee = orders.reduce((s, o) => s + o.serviceFeeAmount, 0);
  const total = orders.reduce((s, o) => s + o.totalAmount, 0);

  const loyaltyPhones = [
    ...new Set(
      orders
        .map((o) => o.customerPhone)
        .filter((p): p is string => Boolean(p?.trim())),
    ),
  ];

  return {
    table: {
      id: table.id,
      number: table.number,
      status: table.status,
      assignedWaiter: table.assignedWaiter
        ? { id: table.assignedWaiter.id, name: table.assignedWaiter.name }
        : null,
    },
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      customerPhone: o.customerPhone,
      subtotalAmount: o.subtotalAmount,
      discountAmount: o.discountAmount,
      serviceFeeAmount: o.serviceFeeAmount,
      totalAmount: o.totalAmount,
      createdByName: orderCreatorLabel({
        source: o.source,
        createdBy: o.createdBy,
      }),
      items: o.items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        name: i.modifierSummary
          ? `${i.product.name} (${i.modifierSummary})`
          : i.product.name,
        unitPrice: i.unitPrice,
        isNewAddition: i.isNewAddition,
      })),
    })),
    subtotal,
    discount,
    serviceFee,
    total,
    orderCount: orders.length,
    loyaltyPhones,
  };
}

export async function closeTableBill(
  cafeId: string,
  tableNumber: number,
  paymentMethod: PaymentMethod,
  opts?: { useCashback?: boolean; customerPhone?: string },
) {
  const table = await prisma.table.findUnique({
    where: { cafeId_number: { cafeId, number: tableNumber } },
  });
  if (!table) {
    return { error: "Stol topilmadi" as const };
  }

  // Find all open orders on this table
  const openOrders = await prisma.order.findMany({
    where: {
      tableId: table.id,
      status: { in: [...OPEN_STATUSES] },
    },
    select: { id: true, serviceMode: true },
  });

  // If there is an assigned waiter on the table, ensure they are credited for waiter-mode orders
  if (table.assignedWaiterId && openOrders.length > 0) {
    for (const order of openOrders) {
      if (order.serviceMode === "SELF") continue;
      await prisma.order.update({
        where: { id: order.id },
        data: { createdById: table.assignedWaiterId },
      });
      await recalculateOrderTotals(order.id);
    }
  }

  const bill = await getTableBill(cafeId, tableNumber);
  if (!bill || bill.orderCount === 0) {
    return { error: "Bu stolda ochiq buyurtma yo'q" as const };
  }

  let cashbackDiscountTiyin = 0;
  const ordersForEarn = await prisma.order.findMany({
    where: { id: { in: bill.orders.map((o) => o.id) } },
    select: { id: true, customerPhone: true, totalAmount: true },
  });

  const redeemPhone =
    opts?.customerPhone?.trim() ||
    (bill.loyaltyPhones.length === 1 ? bill.loyaltyPhones[0] : null);

  if (opts?.useCashback && redeemPhone) {
    const redeem = await applyCashbackRedeem(
      cafeId,
      normalizePhone(redeemPhone),
      bill.orders[0].id,
      bill.total,
    );
    if (redeem.ok && redeem.discountTiyin > 0) {
      cashbackDiscountTiyin = redeem.discountTiyin;
      let remaining = cashbackDiscountTiyin;
      for (const order of bill.orders) {
        if (remaining <= 0) break;
        const apply = Math.min(remaining, order.totalAmount);
        remaining -= apply;
        await prisma.order.update({
          where: { id: order.id },
          data: {
            discountAmount: { increment: apply },
            totalAmount: { decrement: apply },
          },
        });
      }
    }
  }

  const now = new Date();
  const orderIds = bill.orders.map((o) => o.id);

  await prisma.$transaction([
    prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: {
        status: "DELIVERED",
        paymentMethod,
        paidAt: now,
      },
    }),
    prisma.table.update({
      where: { id: table.id },
      data: { status: "FREE", assignedWaiterId: null },
    }),
    prisma.waiterCall.updateMany({
      where: { tableId: table.id, status: "PENDING" },
      data: { status: "DONE" },
    }),
  ]);

  publishCafeEvent(cafeId, { type: "table.updated" });
  for (const id of orderIds) {
    publishCafeEvent(cafeId, {
      type: "order.updated",
      payload: { orderId: id, status: "DELIVERED" },
    });
  }

  await endGuestVisitsForTable(table.id);

  for (const order of ordersForEarn) {
    if (order.customerPhone) {
      await applyLoyaltyEarn(
        cafeId,
        normalizePhone(order.customerPhone),
        order.id,
        order.totalAmount,
      ).catch(() => {});
    }
  }

  issueFiscalForTableOrders(cafeId, table.id).catch(() => {});

  const finalTotal = bill.total - cashbackDiscountTiyin;

  return {
    ok: true as const,
    total: finalTotal,
    cashbackDiscountTiyin,
    orderCount: bill.orderCount,
    tableNumber,
    paymentMethod,
  };
}

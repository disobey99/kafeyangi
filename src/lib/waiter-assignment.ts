import { prisma } from "@/lib/prisma";
import { publishCafeEvent } from "@/lib/realtime";
import {
  isOpenOrderStatus,
  OPEN_ORDER_STATUSES,
} from "@/lib/order-mutate";
import { recalculateOrderTotals } from "@/lib/order-totals";
export {
  WAITER_ASSIGNMENT_TIMEOUT_MS,
  formatWaiterWaitDuration,
  isWaiterAssignmentOverdue,
} from "@/lib/waiter-assignment-shared";

export function orderNeedsWaiterAssignment(order: {
  source: string;
  serviceMode?: string;
  tableId: string | null;
  createdById: string | null;
  status: string;
}): boolean {
  return (
    order.source === "QR_TABLE" &&
    (order.serviceMode ?? "WAITER") === "WAITER" &&
    Boolean(order.tableId) &&
    !order.createdById &&
    isOpenOrderStatus(order.status)
  );
}

export { orderHasWaiterServiceFee } from "@/lib/order-totals";

type BillGateOrder = {
  serviceMode: string;
  createdById: string | null;
  status: string;
};

export function canRequestTableBill(
  orders: BillGateOrder[],
  tableStatus: string,
): { allowed: boolean; reason?: string } {
  if (tableStatus === "BILL_REQUESTED") {
    return { allowed: false, reason: "Hisob allaqachon so'ralgan. Biroz kuting." };
  }

  const openOrders = orders.filter((o) => isOpenOrderStatus(o.status));
  if (openOrders.length === 0) {
    return { allowed: false, reason: "Avval buyurtma bering yoki stol band emas" };
  }

  const waiterOrders = openOrders.filter((o) => o.serviceMode === "WAITER");
  if (waiterOrders.some((o) => !o.createdById)) {
    return {
      allowed: false,
      reason: "Ofitsiant buyurtmani qabul qilgunicha hisob so'ralmaydi",
    };
  }

  const selfOrders = openOrders.filter((o) => o.serviceMode === "SELF");
  if (selfOrders.length > 0 && !selfOrders.some((o) => o.status === "READY")) {
    return {
      allowed: false,
      reason: "Taom tayyor bo'lgach hisob so'rashingiz mumkin",
    };
  }

  return { allowed: true };
}

export async function assignOrderToWaiter(orderId: string, waiterUserId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { table: true },
  });
  if (!order) return { error: "Buyurtma topilmadi" as const };
  if (!order.tableId) return { error: "Stol buyurtmasi emas" as const };
  if (!isOpenOrderStatus(order.status)) return { error: "Buyurtma yopilgan" as const };
  if (order.source !== "QR_TABLE") {
    return { error: "Faqat QR buyurtmalar" as const };
  }
  if (order.serviceMode === "SELF") {
    return { error: "O'z-o'ziga xizmat buyurtmasi — ofitsiant qabul qilish shart emas" as const };
  }
  if (order.createdById) {
    return { error: "Buyurtma allaqachon qabul qilingan" as const };
  }

  const member = await prisma.cafeMember.findFirst({
    where: {
      cafeId: order.cafeId,
      userId: waiterUserId,
      isActive: true,
      role: { in: ["WAITER", "MANAGER", "OWNER"] },
    },
  });
  if (!member) return { error: "Ofitsiant topilmadi" as const };

  const siblingIds = await prisma.order.findMany({
    where: {
      tableId: order.tableId,
      source: "QR_TABLE",
      serviceMode: "WAITER",
      createdById: null,
      status: { in: [...OPEN_ORDER_STATUSES] },
    },
    select: { id: true },
  });

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { id: orderId, createdById: null },
      data: { createdById: waiterUserId },
    });
    if (result.count === 0) return null;

    await tx.table.update({
      where: { id: order.tableId! },
      data: { assignedWaiterId: waiterUserId },
    });

    const otherIds = siblingIds.map((s) => s.id).filter((id) => id !== orderId);
    if (otherIds.length > 0) {
      await tx.order.updateMany({
        where: { id: { in: otherIds }, createdById: null },
        data: { createdById: waiterUserId },
      });
    }

    return tx.order.findUnique({
      where: { id: orderId },
      include: {
        createdBy: { select: { id: true, name: true } },
        table: { select: { id: true, number: true } },
      },
    });
  });

  if (!updated) return { error: "Boshqa ofitsiant qabul qildi" as const };

  for (const sibling of siblingIds) {
    await recalculateOrderTotals(sibling.id);
  }

  publishCafeEvent(order.cafeId, {
    type: "order.updated",
    payload: { orderId, waiterAssigned: true },
  });
  publishCafeEvent(order.cafeId, { type: "table.updated" });

  return { ok: true as const, order: updated };
}

/** Kassir/menejer: stolni boshqa ofitsantga o'tkazish */
export async function reassignTableToWaiter(tableId: string, waiterUserId: string) {
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    select: {
      id: true,
      cafeId: true,
      number: true,
      assignedWaiterId: true,
      assignedWaiter: { select: { id: true, name: true } },
    },
  });
  if (!table) return { error: "Stol topilmadi" as const };

  const member = await prisma.cafeMember.findFirst({
    where: {
      cafeId: table.cafeId,
      userId: waiterUserId,
      isActive: true,
      role: { in: ["WAITER", "MANAGER", "OWNER", "CASHIER"] },
    },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!member) return { error: "Ofitsiant topilmadi yoki faol emas" as const };

  if (table.assignedWaiterId === waiterUserId) {
    return {
      ok: true as const,
      assignedWaiter: table.assignedWaiter,
      unchanged: true as const,
    };
  }

  const openOrders = await prisma.order.findMany({
    where: {
      tableId,
      status: { in: [...OPEN_ORDER_STATUSES] },
    },
    select: { id: true, serviceMode: true },
  });

  if (openOrders.length === 0) {
    return { error: "Stolda ochiq buyurtma yo'q" as const };
  }

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: { assignedWaiterId: waiterUserId },
    include: { assignedWaiter: { select: { id: true, name: true } } },
  });

  // Xizmat to'lovi / ofitsiant bog'langan buyurtmalar
  const assignableIds = openOrders
    .filter((o) => o.serviceMode !== "SELF")
    .map((o) => o.id);

  if (assignableIds.length > 0) {
    await prisma.order.updateMany({
      where: { id: { in: assignableIds } },
      data: { createdById: waiterUserId },
    });
    for (const id of assignableIds) {
      await recalculateOrderTotals(id);
    }
  }

  publishCafeEvent(table.cafeId, {
    type: "table.updated",
    payload: {
      tableId,
      reassigned: true,
      waiterId: waiterUserId,
      waiterName: member.user.name,
      fromWaiterId: table.assignedWaiterId,
    },
  });
  publishCafeEvent(table.cafeId, {
    type: "order.updated",
    payload: { tableId, waiterReassigned: true },
  });

  return {
    ok: true as const,
    assignedWaiter: updated.assignedWaiter,
    orderCount: assignableIds.length,
    previousWaiter: table.assignedWaiter,
  };
}

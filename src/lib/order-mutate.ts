import { prisma } from "@/lib/prisma";
import { resolveOrderItemModifiers } from "@/lib/modifiers";
import { resolvePrepStationsForProducts } from "@/lib/prep-stations";
import { shouldAutoSendToKitchen } from "@/lib/order-kitchen-routing";
import { enqueueKitchenPrintJobs } from "@/lib/kitchen-print-jobs";
import { recalculateOrderTotals } from "@/lib/order-totals";
import { publishCafeEvent } from "@/lib/realtime";
import { syncTableStatusFromOrders } from "@/lib/reports";

export const OPEN_ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
] as const;

export function isOpenOrderStatus(status: string) {
  return (OPEN_ORDER_STATUSES as readonly string[]).includes(status);
}

/** Stoldagi birinchi ochiq buyurtma — qo'shimchalar shu buyurtmaga qo'shiladi */
export async function findPrimaryOpenTableOrder(tableId: string) {
  return prisma.order.findFirst({
    where: {
      tableId,
      status: { in: [...OPEN_ORDER_STATUSES] },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Mijoz tashrifi bo'yicha ochiq buyurtma */
export async function findPrimaryOpenTableOrderForVisit(
  tableId: string,
  guestVisitId: string,
) {
  return prisma.order.findFirst({
    where: {
      tableId,
      guestVisitId,
      status: { in: [...OPEN_ORDER_STATUSES] },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function clearOrderNewItemFlags(orderId: string) {
  await prisma.orderItem.updateMany({
    where: { orderId, isNewAddition: true },
    data: { isNewAddition: false },
  });
}

type NewItemInput = {
  productId: string;
  quantity: number;
  modifierOptionIds?: string[];
};

type AddItemsOptions = {
  /** Qo'shimcha taom — kassada "Yangi" belgisi (faqat kassir tasdig'i kerak bo'lsa) */
  markAsNew?: boolean;
  /** To'g'ridan-to'g'ri oshxonaga (CONFIRMED) */
  sendToKitchen?: boolean;
};

export async function addItemsToOrder(
  orderId: string,
  items: NewItemInput[],
  options?: AddItemsOptions,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { error: "Buyurtma topilmadi" as const };
  if (!isOpenOrderStatus(order.status)) {
    return { error: "Yopilgan buyurtmaga qo'shib bo'lmaydi" as const };
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, cafeId: order.cafeId, isAvailable: true },
  });
  if (products.length !== productIds.length) {
    return { error: "Ba'zi mahsulotlar mavjud emas" as const };
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  const sendToKitchen =
    options?.sendToKitchen ?? shouldAutoSendToKitchen(order.source);
  const markAsNew = sendToKitchen ? false : (options?.markAsNew ?? false);
  const itemStatus = sendToKitchen
    ? "CONFIRMED"
    : markAsNew
      ? "PENDING"
      : order.status;

  const stationByProduct = await resolvePrepStationsForProducts(
    order.cafeId,
    productIds,
  );

  const createdItemIds: string[] = [];

  const useAppDiscountPrice =
    order.source === "ONLINE" || order.source === "QR_TABLE";

  for (const item of items) {
    const product = productMap.get(item.productId)!;
    const { unitExtra, summary } = await resolveOrderItemModifiers(
      product.id,
      item.modifierOptionIds,
    );
    const basePrice =
      useAppDiscountPrice &&
      product.discountPrice != null &&
      product.discountPrice > 0
        ? product.discountPrice
        : product.price;
    const unitPrice = basePrice + unitExtra;
    const station = stationByProduct.get(product.id);
    const created = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        modifierSummary: summary,
        isNewAddition: markAsNew,
        prepStationId: station?.id ?? null,
        prepStationName: station?.name ?? null,
        status: itemStatus,
      },
    });
    createdItemIds.push(created.id);
  }

  if (sendToKitchen && order.status === "PENDING") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CONFIRMED" },
    });
  }

  await recalculateOrderTotals(order.id);

  if (sendToKitchen && createdItemIds.length > 0) {
    await enqueueKitchenPrintJobs(order.id, { itemIds: createdItemIds }).catch(
      (e) => console.error("enqueueKitchenPrintJobs:", e),
    );
  }

  publishCafeEvent(order.cafeId, {
    type: "order.updated",
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      hasNewItems: markAsNew,
      appended: true,
      kitchenReady: sendToKitchen,
    },
  });

  const updated = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: { include: { product: true } }, table: true },
  });

  return { ok: true as const, orderId: order.id, order: updated };
}

export async function updateOrderItemQuantity(itemId: string, quantity: number) {
  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: { order: true },
  });
  if (!item) return { error: "Pozitsiya topilmadi" as const };
  if (!isOpenOrderStatus(item.order.status)) {
    return { error: "Yopilgan buyurtmani o'zgartirib bo'lmaydi" as const };
  }

  const orderId = item.orderId;
  const cafeId = item.order.cafeId;
  const tableId = item.order.tableId;

  if (quantity <= 0) {
    await prisma.orderItem.delete({ where: { id: itemId } });
    const remaining = await prisma.orderItem.count({ where: { orderId } });
    if (remaining === 0) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      });
      if (tableId) {
        await syncTableStatusFromOrders(tableId);
        publishCafeEvent(cafeId, { type: "table.updated" });
      }
    } else {
      await recalculateOrderTotals(orderId);
    }
  } else {
    await prisma.orderItem.update({
      where: { id: itemId },
      data: { quantity },
    });
    await recalculateOrderTotals(orderId);
  }

  publishCafeEvent(cafeId, {
    type: "order.updated",
    payload: { orderId },
  });

  return { ok: true as const };
}

export async function cancelOrderByStaff(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Buyurtma topilmadi" as const };
  if (order.status === "DELIVERED") {
    return { error: "To'langan buyurtmani bekor qilib bo'lmaydi" as const };
  }
  if (order.status === "CANCELLED") {
    return { ok: true as const };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
  });

  if (order.tableId) {
    await syncTableStatusFromOrders(order.tableId);
    publishCafeEvent(order.cafeId, { type: "table.updated" });
  }

  publishCafeEvent(order.cafeId, {
    type: "order.updated",
    payload: { orderId, status: "CANCELLED" },
  });

  return { ok: true as const };
}

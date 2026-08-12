import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { syncTableStatusFromOrders } from "@/lib/reports";
import { publishCafeEvent } from "@/lib/realtime";
import { applyLoyaltyEarn, normalizePhone } from "@/lib/loyalty";
import { requireCafeStaff } from "@/lib/cafe-access";
import { cancelOrderByStaff, clearOrderNewItemFlags } from "@/lib/order-mutate";
import { enqueueKitchenPrintJobs } from "@/lib/kitchen-print-jobs";
import { sendCourierDeliveryPush } from "@/lib/push-server";

const updateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = updateSchema.parse(await request.json());
    const { status } = body;

    const prev = await prisma.order.findUnique({ where: { id } });
    if (!prev) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    }

    const access = await requireCafeStaff(prev.cafeId);
    if (!access.ok) return access.response;

    // Yetkazish buyurtmasini faqat yetkazuvchi yakunlaydi (courier-deliver)
    if (status === "DELIVERED" && prev.type === "DELIVERY") {
      return NextResponse.json(
        {
          error:
            "Yetkazish buyurtmasini kassir yakunlay olmaydi — faqat yetkazuvchi «Yetkazdim» qiladi",
        },
        { status: 403 },
      );
    }

    if (status === "CANCELLED") {
      const result = await cancelOrderByStaff(id);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const order = await prisma.order.findUnique({ where: { id } });
      return NextResponse.json({ order });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
    });

    // Buyurtma holati bilan pozitsiyalarni sinxronlash
    if (status === "CONFIRMED") {
      const pendingItems = await prisma.orderItem.findMany({
        where: { orderId: id, status: "PENDING" },
        select: { id: true },
      });
      await prisma.orderItem.updateMany({
        where: {
          orderId: id,
          status: "PENDING",
        },
        data: { status: "CONFIRMED" },
      });
      if (pendingItems.length > 0) {
        await enqueueKitchenPrintJobs(id, {
          itemIds: pendingItems.map((i) => i.id),
        }).catch((e) => console.error("enqueueKitchenPrintJobs:", e));
      }
    } else if (status === "PREPARING") {
      await prisma.orderItem.updateMany({
        where: {
          orderId: id,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        data: { status: "PREPARING" },
      });
    } else if (status === "READY") {
      await prisma.orderItem.updateMany({
        where: {
          orderId: id,
          status: { notIn: ["CANCELLED", "DELIVERED"] },
        },
        data: { status: "READY" },
      });
    }

    if (status === "CONFIRMED" || status === "PREPARING") {
      await clearOrderNewItemFlags(id);
    }

    if (
      status === "DELIVERED" &&
      prev.status !== "DELIVERED" &&
      order.customerPhone
    ) {
      applyLoyaltyEarn(
        order.cafeId,
        normalizePhone(order.customerPhone),
        order.id,
        order.totalAmount,
      ).catch(() => {});
    }

    if (order.tableId && status === "DELIVERED") {
      await syncTableStatusFromOrders(order.tableId);
      publishCafeEvent(order.cafeId, { type: "table.updated" });
    }

    publishCafeEvent(order.cafeId, {
      type: "order.updated",
      payload: { orderId: order.id, status },
    });

    if (
      order.type === "DELIVERY" &&
      (status === "CONFIRMED" || status === "READY") &&
      prev.status !== status
    ) {
      sendCourierDeliveryPush(order.cafeId, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status,
      }).catch(() => {});
    }

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

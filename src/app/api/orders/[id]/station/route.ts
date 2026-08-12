import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { clearOrderNewItemFlags } from "@/lib/order-mutate";
import { syncOrderStatusFromItems } from "@/lib/prep-stations";
import { publishCafeEvent } from "@/lib/realtime";

const schema = z.object({
  stationId: z.string().min(1),
  status: z.enum(["PREPARING", "READY"]),
});

/**
 * Bitta stansiya uchun buyurtma pozitsiyalarini yangilash.
 * Kabobchi faqat o'z taomlarini "Tayyor" qiladi — butun buyurtma emas.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;
    const body = schema.parse(await request.json());

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            id: true,
            status: true,
            prepStationId: true,
          },
        },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    }

    const access = await requireCafeStaff(order.cafeId);
    if (!access.ok) return access.response;

    if (order.status === "CANCELLED" || order.status === "DELIVERED") {
      return NextResponse.json({ error: "Buyurtma yopilgan" }, { status: 400 });
    }

    const station = await prisma.prepStation.findFirst({
      where: { id: body.stationId, cafeId: order.cafeId },
    });
    if (!station) {
      return NextResponse.json({ error: "Stansiya topilmadi" }, { status: 404 });
    }

    const stationItems = order.items.filter(
      (i) => i.prepStationId === body.stationId || (!i.prepStationId && station.isDefault),
    );

    if (stationItems.length === 0) {
      return NextResponse.json({ error: "Bu stansiyaga taom yo'q" }, { status: 400 });
    }

    const itemIds = stationItems
      .filter((i) => i.status !== "CANCELLED" && i.status !== "READY")
      .map((i) => i.id);

    if (itemIds.length === 0 && body.status === "READY") {
      // All already ready — still sync
    } else if (itemIds.length > 0) {
      await prisma.orderItem.updateMany({
        where: { id: { in: itemIds } },
        data: { status: body.status },
      });
    }

    if (body.status === "PREPARING" || body.status === "READY") {
      await clearOrderNewItemFlags(orderId);
    }

    const updatedOrder = await syncOrderStatusFromItems(orderId);

    publishCafeEvent(order.cafeId, {
      type: "order.updated",
      payload: {
        orderId,
        status: updatedOrder?.status,
        stationId: body.stationId,
        stationStatus: body.status,
      },
    });

    return NextResponse.json({
      order: updatedOrder,
      stationId: body.stationId,
      status: body.status,
    });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { CafeRole } from "@prisma/client";
import { requireCafeStaff } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";
import { applyLoyaltyEarn, normalizePhone } from "@/lib/loyalty";
import { publishCafeEvent } from "@/lib/realtime";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const prev = await prisma.order.findUnique({ where: { id } });
  if (!prev) {
    return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
  }

  const access = await requireCafeStaff(prev.cafeId, [
    CafeRole.COURIER,
    CafeRole.OWNER,
    CafeRole.MANAGER,
  ]);
  if (!access.ok) return access.response;

  if (prev.type !== "DELIVERY") {
    return NextResponse.json({ error: "Bu yetkazish buyurtmasi emas" }, { status: 400 });
  }

  if (prev.status === "DELIVERED") {
    return NextResponse.json({ order: prev });
  }

  if (prev.status === "CANCELLED") {
    return NextResponse.json({ error: "Buyurtma bekor qilingan" }, { status: 400 });
  }

  // Kassir emas — faqat yetkazuvchi (yoki egasi/menejer favqulodda)
  if (access.role === CafeRole.COURIER) {
    if (prev.assignedCourierId !== access.session.userId) {
      return NextResponse.json(
        { error: "Avval buyurtmani qabul qiling" },
        { status: 403 },
      );
    }
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: "DELIVERED",
      assignedCourierId: prev.assignedCourierId ?? access.session.userId,
    },
  });

  await prisma.orderItem.updateMany({
    where: {
      orderId: id,
      status: { notIn: ["CANCELLED", "DELIVERED"] },
    },
    data: { status: "DELIVERED" },
  });

  if (order.customerPhone) {
    applyLoyaltyEarn(
      order.cafeId,
      normalizePhone(order.customerPhone),
      order.id,
      order.totalAmount,
    ).catch(() => {});
  }

  publishCafeEvent(order.cafeId, {
    type: "order.updated",
    payload: { orderId: order.id, status: "DELIVERED" },
  });

  return NextResponse.json({ order });
}

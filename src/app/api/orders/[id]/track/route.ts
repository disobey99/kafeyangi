import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_LABELS } from "@/lib/utils";

const STATUS_STEPS = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      type: true,
      serviceMode: true,
      totalAmount: true,
      notes: true,
      createdAt: true,
      assignedCourierId: true,
      assignedCourier: {
        select: {
          name: true,
          phone: true,
          avatarUrl: true,
        },
      },
      items: {
        select: {
          quantity: true,
          product: { select: { name: true } },
        },
      },
      review: {
        select: { score: true, comment: true, createdAt: true },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
  }

  const stepIndex = STATUS_STEPS.indexOf(order.status);
  const courierClaimed = Boolean(order.assignedCourierId);
  const statusLabel =
    order.status === "CANCELLED"
      ? (ORDER_STATUS_LABELS.CANCELLED ?? "Bekor qilindi")
      : order.type === "DELIVERY" &&
          order.status === "READY" &&
          !courierClaimed
        ? "Yetkazuvchi kutilmoqda"
        : order.type === "DELIVERY" &&
            order.status === "READY" &&
            courierClaimed
          ? "Yo'lda"
          : (ORDER_STATUS_LABELS[order.status] ?? order.status);

  return NextResponse.json({
    order: {
      ...order,
      courierClaimed,
      statusLabel,
      stepIndex: order.status === "CANCELLED" ? -1 : stepIndex >= 0 ? stepIndex : 0,
      totalSteps: STATUS_STEPS.length - 1,
      cancelled: order.status === "CANCELLED",
    },
  });
}

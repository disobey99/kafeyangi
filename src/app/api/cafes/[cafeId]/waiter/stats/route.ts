import { NextRequest, NextResponse } from "next/server";
import { requireCafeStaff } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";
import { CafeRole } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId, [CafeRole.WAITER, CafeRole.OWNER, CafeRole.MANAGER]);
  if (!access.ok) return access.response;

  const waiterId = access.session.userId;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [orderCount, deliveredOrders] = await Promise.all([
    prisma.order.count({
      where: {
        cafeId,
        createdById: waiterId,
        createdAt: { gte: todayStart },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.order.findMany({
      where: {
        cafeId,
        createdById: waiterId,
        createdAt: { gte: todayStart },
        status: "DELIVERED",
      },
      select: {
        serviceFeeAmount: true,
      },
    }),
  ]);

  const serviceFeeSum = deliveredOrders.reduce((sum, o) => sum + o.serviceFeeAmount, 0);

  return NextResponse.json({
    orderCount,
    serviceFeeSum,
  });
}

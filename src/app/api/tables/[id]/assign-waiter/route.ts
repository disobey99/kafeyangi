import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { publishCafeEvent } from "@/lib/realtime";
import { recalculateOrderTotals } from "@/lib/order-totals";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const table = await prisma.table.findUnique({ where: { id } });
  if (!table) {
    return NextResponse.json({ error: "Stol topilmadi" }, { status: 404 });
  }

  const access = await requireCafeStaff(table.cafeId);
  if (!access.ok) return access.response;

  const updated = await prisma.table.update({
    where: { id },
    data: { assignedWaiterId: access.session.userId },
    include: { assignedWaiter: { select: { id: true, name: true } } },
  });

  // Find all open orders on this table and assign them to this waiter, then recalculate totals
  const openOrders = await prisma.order.findMany({
    where: {
      tableId: id,
      serviceMode: "WAITER",
      status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
    },
    select: { id: true },
  });

  for (const order of openOrders) {
    await prisma.order.update({
      where: { id: order.id },
      data: { createdById: access.session.userId },
    });
    await recalculateOrderTotals(order.id);
  }

  publishCafeEvent(table.cafeId, { type: "table.updated" });

  return NextResponse.json({
    assignedWaiter: updated.assignedWaiter,
  });
}

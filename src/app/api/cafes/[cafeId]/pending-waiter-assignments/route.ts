import { NextRequest, NextResponse } from "next/server";
import { CafeRole } from "@prisma/client";
import { requireCafeStaff } from "@/lib/cafe-access";
import { OPEN_ORDER_STATUSES } from "@/lib/order-mutate";
import { prisma } from "@/lib/prisma";
import { isWaiterAssignmentOverdue } from "@/lib/waiter-assignment-shared";

const ROLES: CafeRole[] = [
  CafeRole.OWNER,
  CafeRole.MANAGER,
  CafeRole.CASHIER,
  CafeRole.WAITER,
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeStaff(cafeId, ROLES);
    if (!access.ok) return access.response;

    const orders = await prisma.order.findMany({
      where: {
        cafeId,
        source: "QR_TABLE",
        serviceMode: "WAITER",
        tableId: { not: null },
        createdById: null,
        status: { in: [...OPEN_ORDER_STATUSES] },
      },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        status: true,
        table: { select: { id: true, number: true } },
        items: { select: { quantity: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const pending = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      status: order.status,
      tableId: order.table!.id,
      tableNumber: order.table!.number,
      itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
      overdue: isWaiterAssignmentOverdue(order.createdAt),
    }));

    return NextResponse.json({ pending });
  } catch (error) {
    console.error("GET pending-waiter-assignments:", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

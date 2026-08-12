import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { orderCreatorLabel, ORDER_STATUS_LABELS } from "@/lib/utils";
import { OPEN_ORDER_STATUSES } from "@/lib/order-mutate";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const table = await prisma.table.findUnique({
    where: { id },
    include: { assignedWaiter: { select: { id: true, name: true } } },
  });
  if (!table) {
    return NextResponse.json({ error: "Stol topilmadi" }, { status: 404 });
  }

  const access = await requireCafeStaff(table.cafeId);
  if (!access.ok) return access.response;

  const orders = await prisma.order.findMany({
    where: {
      tableId: id,
      status: { in: [...OPEN_ORDER_STATUSES] },
    },
    orderBy: { createdAt: "asc" },
    include: {
      items: {
        include: { product: { select: { name: true } } },
      },
      createdBy: { select: { name: true } },
    },
  });

  return NextResponse.json({
    table: {
      id: table.id,
      number: table.number,
      status: table.status,
      assignedWaiter: table.assignedWaiter,
    },
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      statusLabel: ORDER_STATUS_LABELS[o.status] ?? o.status,
      source: o.source,
      totalAmount: o.totalAmount,
      notes: o.notes,
      createdByName: orderCreatorLabel({ source: o.source, createdBy: o.createdBy }),
      items: o.items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        isNewAddition: i.isNewAddition,
        name: i.modifierSummary
          ? `${i.product.name} (${i.modifierSummary})`
          : i.product.name,
      })),
    })),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTableGuest } from "@/lib/table-guest";
import { ORDER_STATUS_LABELS } from "@/lib/utils";
import { TABLE_STATUS_LABELS } from "@/lib/reports";
import { OPEN_ORDER_STATUSES } from "@/lib/order-mutate";
import { canRequestTableBill } from "@/lib/waiter-assignment";
import { resolveTableGuestVisit } from "@/lib/table-guest-visit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("token");
  const visitToken = request.nextUrl.searchParams.get("visitToken");
  if (!token) {
    return NextResponse.json({ error: "QR token kerak" }, { status: 400 });
  }

  const guest = await verifyTableGuest(id, token);
  if (!guest.ok) {
    return NextResponse.json({ error: guest.error }, { status: 404 });
  }

  let visitId: string | null = null;
  let sessionClosed = guest.table.status === "BILL_REQUESTED";
  let orderingAllowed = false;
  let tableBusy = false;

  if (visitToken) {
    const visit = await resolveTableGuestVisit(id, token, visitToken);
    if (visit.ok) {
      sessionClosed = visit.sessionClosed;
      orderingAllowed = visit.orderingAllowed;
      tableBusy = visit.tableBusy;
      visitId = visit.visitId || null;
    }
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [activeOrders, recentOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        tableId: id,
        status: { in: [...OPEN_ORDER_STATUSES] },
        ...(visitId ? { guestVisitId: visitId } : { id: { in: [] as string[] } }),
      },
      orderBy: { createdAt: "asc" },
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    }),
    visitId
      ? prisma.order.findMany({
          where: {
            tableId: id,
            guestVisitId: visitId,
            status: "DELIVERED",
            createdAt: { gte: since },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
          include: {
            items: {
              include: { product: { select: { name: true } } },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const mapOrder = (o: (typeof activeOrders)[number]) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    type: o.type,
    statusLabel: ORDER_STATUS_LABELS[o.status] ?? o.status,
    serviceMode: o.serviceMode,
    waiterAccepted: Boolean(o.createdById),
    totalAmount: o.totalAmount,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      quantity: i.quantity,
      name: i.modifierSummary
        ? `${i.product.name} (${i.modifierSummary})`
        : i.product.name,
    })),
  });

  const billGateOrders = activeOrders.map((o) => ({
    serviceMode: o.serviceMode,
    createdById: o.createdById,
    status: o.status,
  }));
  const billCheck = canRequestTableBill(billGateOrders, guest.table.status);
  const lockedServiceMode =
    activeOrders.length > 0 ? activeOrders[0]!.serviceMode : null;

  return NextResponse.json({
    table: {
      number: guest.table.number,
      status: guest.table.status,
      statusLabel: TABLE_STATUS_LABELS[guest.table.status] ?? guest.table.status,
    },
    sessionClosed,
    orderingAllowed,
    tableBusy,
    canRequestBill: billCheck.allowed,
    billBlockReason: billCheck.reason ?? null,
    lockedServiceMode,
    activeOrders: sessionClosed ? [] : activeOrders.map(mapOrder),
    recentOrders: sessionClosed ? [] : recentOrders.map(mapOrder),
  });
}

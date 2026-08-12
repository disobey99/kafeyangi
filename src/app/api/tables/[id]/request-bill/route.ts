import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyTableGuest } from "@/lib/table-guest";
import { publishCafeEvent } from "@/lib/realtime";
import { OPEN_ORDER_STATUSES } from "@/lib/order-mutate";
import { canRequestTableBill } from "@/lib/waiter-assignment";
import { endGuestVisitsForTable } from "@/lib/table-guest-visit";

const schema = z.object({
  token: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { token } = schema.parse(await request.json());

    const guest = await verifyTableGuest(id, token);
    if (!guest.ok) {
      return NextResponse.json({ error: guest.error }, { status: 404 });
    }

    const openOrders = await prisma.order.findMany({
      where: {
        tableId: id,
        status: { in: [...OPEN_ORDER_STATUSES] },
      },
      select: {
        serviceMode: true,
        createdById: true,
        status: true,
      },
    });

    const billCheck = canRequestTableBill(openOrders, guest.table.status);
    if (!billCheck.allowed) {
      return NextResponse.json({ error: billCheck.reason }, { status: 403 });
    }

    await prisma.table.update({
      where: { id },
      data: { status: "BILL_REQUESTED" },
    });

    const tableWithWaiter = await prisma.table.findUnique({
      where: { id },
      select: {
        assignedWaiter: { select: { id: true, name: true } },
      },
    });

    await endGuestVisitsForTable(id);

    publishCafeEvent(guest.table.cafeId, {
      type: "table.updated",
      payload: { tableId: id, tableNumber: guest.table.number, billRequested: true },
    });

    return NextResponse.json({
      ok: true,
      waiter: tableWithWaiter?.assignedWaiter ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

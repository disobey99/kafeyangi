import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publishCafeEvent } from "@/lib/realtime";
import { notifyTelegramWaiterCall } from "@/lib/notify";
import { sendWaiterCallPush } from "@/lib/push-server";
import { checkPlanFeature } from "@/lib/plan-access";
import { verifyTableGuest } from "@/lib/table-guest";

const bodySchema = z.object({
  token: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let token: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    token = bodySchema.parse(body).token;
  } catch {
    /* empty body allowed for legacy */
  }

  let table;
  if (token) {
    const guest = await verifyTableGuest(id, token);
    if (!guest.ok) {
      return NextResponse.json({ error: guest.error }, { status: 404 });
    }
    table = { ...guest.table, cafe: guest.table.cafe };
  } else {
    table = await prisma.table.findUnique({
      where: { id },
      include: { cafe: true },
    });
  }

  if (!table) {
    return NextResponse.json({ error: "Stol topilmadi" }, { status: 404 });
  }

  if (table.cafe.status === "SUSPENDED" || table.cafe.status === "CANCELLED") {
    return NextResponse.json({ error: "Kafe vaqtincha yopiq" }, { status: 403 });
  }

  const feature = await checkPlanFeature(table.cafeId, "waiterCall");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }

  const recent = await prisma.waiterCall.findFirst({
    where: {
      tableId: id,
      status: "PENDING",
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
    },
  });

  if (recent) {
    return NextResponse.json(
      { error: "Ofitsiant allaqachon chaqirilgan. Biroz kuting." },
      { status: 429 }
    );
  }

  const call = await prisma.waiterCall.create({
    data: { cafeId: table.cafeId, tableId: id },
  });

  publishCafeEvent(table.cafeId, {
    type: "waiter.called",
    payload: { callId: call.id, tableNumber: table.number },
  });

  notifyTelegramWaiterCall(table.cafeId, table.number).catch(() => {});
  sendWaiterCallPush(table.cafeId, table.number, call.id).catch(() => {});

  return NextResponse.json({ ok: true, callId: call.id });
}

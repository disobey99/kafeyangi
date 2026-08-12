import { NextResponse } from "next/server";
import { CafeRole } from "@prisma/client";
import { requireCafeStaff } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";
import { publishCafeEvent } from "@/lib/realtime";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
  }

  const access = await requireCafeStaff(order.cafeId, [CafeRole.COURIER]);
  if (!access.ok) return access.response;

  if (order.type !== "DELIVERY") {
    return NextResponse.json({ error: "Bu yetkazish buyurtmasi emas" }, { status: 400 });
  }

  const member = await prisma.cafeMember.findUnique({
    where: {
      cafeId_userId: { cafeId: order.cafeId, userId: access.session.userId },
    },
    select: { onDuty: true },
  });
  if (!member?.onDuty) {
    return NextResponse.json(
      { error: "Siz ishda emassiz — avval «Ishda» statusini yoqing" },
      { status: 403 },
    );
  }

  if (order.status !== "READY") {
    return NextResponse.json(
      { error: "Buyurtma hali tayyor emas — oshxonani kuting" },
      { status: 400 },
    );
  }

  if (order.assignedCourierId && order.assignedCourierId !== access.session.userId) {
    return NextResponse.json({ error: "Boshqa yetkazuvchi olgan" }, { status: 409 });
  }

  let etaMinutes: number | null = null;
  try {
    const body = await _request.json();
    if (typeof body.etaMinutes === "number") {
      etaMinutes = body.etaMinutes;
    }
  } catch {
    /* ignore */
  }

  const cleanNotes = order.notes ? order.notes.replace(/\[ETA:\s*\d+\]\s*/g, "").trim() : "";
  const updatedNotes = etaMinutes != null
    ? (cleanNotes ? `${cleanNotes}\n[ETA: ${etaMinutes}]` : `[ETA: ${etaMinutes}]`)
    : order.notes;

  const updated = await prisma.order.update({
    where: { id },
    data: {
      assignedCourierId: access.session.userId,
      notes: updatedNotes,
    },
  });

  publishCafeEvent(order.cafeId, {
    type: "order.updated",
    payload: { orderId: id, status: updated.status },
  });

  return NextResponse.json({ order: updated });
}

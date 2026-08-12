import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishCafeEvent } from "@/lib/realtime";
import { getSession } from "@/lib/auth";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();

  const call = await prisma.waiterCall.findUnique({ where: { id } });
  if (!call) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  await prisma.waiterCall.update({
    where: { id },
    data: {
      status: "DONE",
      respondedAt: new Date(),
      respondedById: session?.userId ?? null,
    },
  });

  publishCafeEvent(call.cafeId, { type: "waiter.acknowledged" });

  return NextResponse.json({ ok: true });
}

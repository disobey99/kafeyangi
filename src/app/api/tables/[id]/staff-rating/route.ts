import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyTableGuest } from "@/lib/table-guest";
import { createStaffRating, hasTableRating } from "@/lib/staff-ratings";

const schema = z.object({
  token: z.string().min(1),
  score: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
  memberUserId: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: tableId } = await params;
    const body = schema.parse(await request.json());

    const guest = await verifyTableGuest(tableId, body.token);
    if (!guest.ok) {
      return NextResponse.json({ error: guest.error }, { status: 404 });
    }

    if (await hasTableRating(tableId)) {
      return NextResponse.json({ error: "Reyting allaqachon qoldirilgan" }, { status: 400 });
    }

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      select: {
        cafeId: true,
        assignedWaiterId: true,
        orders: {
          where: { status: { not: "CANCELLED" } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { createdById: true },
        },
      },
    });
    if (!table) {
      return NextResponse.json({ error: "Stol topilmadi" }, { status: 404 });
    }

    const memberUserId =
      body.memberUserId ??
      table.assignedWaiterId ??
      table.orders.find((o) => o.createdById)?.createdById ??
      null;

    if (!memberUserId) {
      return NextResponse.json({ error: "Xodim topilmadi" }, { status: 400 });
    }

    const member = await prisma.cafeMember.findFirst({
      where: {
        cafeId: table.cafeId,
        userId: memberUserId,
        isActive: true,
        role: { in: ["WAITER", "CASHIER", "MANAGER"] },
      },
    });
    if (!member) {
      return NextResponse.json({ error: "Xodim topilmadi" }, { status: 400 });
    }

    await createStaffRating({
      cafeId: table.cafeId,
      memberUserId,
      tableId,
      score: body.score,
      comment: body.comment,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { updateOrderItemQuantity } from "@/lib/order-mutate";

const schema = z.object({
  quantity: z.number().int().min(0),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { itemId } = await params;
    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    });
    if (!item) {
      return NextResponse.json({ error: "Pozitsiya topilmadi" }, { status: 404 });
    }

    const access = await requireCafeStaff(item.order.cafeId);
    if (!access.ok) return access.response;

    const { quantity } = schema.parse(await request.json());
    const result = await updateOrderItemQuantity(itemId, quantity);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

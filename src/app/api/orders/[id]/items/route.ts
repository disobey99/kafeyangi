import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { addItemsToOrder } from "@/lib/order-mutate";
import { shouldAutoSendToKitchen } from "@/lib/order-kitchen-routing";

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1),
        modifierOptionIds: z.array(z.string()).optional(),
      }),
    )
    .min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    }

    const access = await requireCafeStaff(order.cafeId);
    if (!access.ok) return access.response;

    const body = schema.parse(await request.json());
    const result = await addItemsToOrder(id, body.items, {
      sendToKitchen: shouldAutoSendToKitchen(order.source),
      markAsNew: !shouldAutoSendToKitchen(order.source),
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const updated = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        table: true,
      },
    });

    return NextResponse.json({ order: updated });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

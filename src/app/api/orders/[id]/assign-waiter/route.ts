import { NextRequest, NextResponse } from "next/server";
import { CafeRole } from "@prisma/client";
import { z } from "zod";
import { requireCafeStaff } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";
import { assignOrderToWaiter } from "@/lib/waiter-assignment";

const CASHIER_ROLES: CafeRole[] = [
  CafeRole.OWNER,
  CafeRole.MANAGER,
  CafeRole.CASHIER,
];

const bodySchema = z.object({
  waiterUserId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = bodySchema.parse(await request.json());

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    }

    const access = await requireCafeStaff(order.cafeId, CASHIER_ROLES);
    if (!access.ok) return access.response;

    const result = await assignOrderToWaiter(id, body.waiterUserId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ order: result.order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
    }
    console.error("POST assign-waiter:", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

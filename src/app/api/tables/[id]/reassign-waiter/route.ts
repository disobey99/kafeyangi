import { NextRequest, NextResponse } from "next/server";
import { CafeRole } from "@prisma/client";
import { z } from "zod";
import { requireCafeStaff } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";
import { reassignTableToWaiter } from "@/lib/waiter-assignment";

const FLOOR_ROLES: CafeRole[] = [
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
    const table = await prisma.table.findUnique({
      where: { id },
      select: { cafeId: true },
    });
    if (!table) {
      return NextResponse.json({ error: "Stol topilmadi" }, { status: 404 });
    }

    const access = await requireCafeStaff(table.cafeId, FLOOR_ROLES);
    if (!access.ok) return access.response;

    const body = bodySchema.parse(await request.json());
    const result = await reassignTableToWaiter(id, body.waiterUserId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
    }
    console.error("POST reassign-waiter:", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

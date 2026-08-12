import { NextRequest, NextResponse } from "next/server";
import { CafeRole } from "@prisma/client";
import { requireCafeStaff } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";
import { requireStaffPinUnlocked } from "@/lib/staff-pin";
import { assignOrderToWaiter } from "@/lib/waiter-assignment";

const WAITER_ROLES: CafeRole[] = [
  CafeRole.OWNER,
  CafeRole.MANAGER,
  CafeRole.WAITER,
];

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    }

    const access = await requireCafeStaff(order.cafeId, WAITER_ROLES);
    if (!access.ok) return access.response;

    const pinCheck = await requireStaffPinUnlocked(order.cafeId, access.session.userId);
    if (!pinCheck.ok) {
      return NextResponse.json(
        {
          error:
            pinCheck.reason === "setup_required"
              ? "Avval xavfsizlik parolini o'rnating"
              : "Ekran qulflangan — parol kiriting",
        },
        { status: 403 },
      );
    }

    const result = await assignOrderToWaiter(id, access.session.userId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ order: result.order });
  } catch (error) {
    console.error("POST accept-waiter:", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

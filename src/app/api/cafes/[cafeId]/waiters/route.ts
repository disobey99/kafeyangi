import { NextResponse } from "next/server";
import { CafeRole } from "@prisma/client";
import { requireCafeStaff } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";

const FLOOR_ROLES: CafeRole[] = [
  CafeRole.OWNER,
  CafeRole.MANAGER,
  CafeRole.CASHIER,
];

/** Kassir/menejer: stolni o'tkazish uchun ofitsiantlar ro'yxati */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId, FLOOR_ROLES);
  if (!access.ok) return access.response;

  const members = await prisma.cafeMember.findMany({
    where: {
      cafeId,
      isActive: true,
      role: { in: ["WAITER", "MANAGER", "OWNER"] },
    },
    select: {
      role: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    waiters: members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      role: m.role,
    })),
  });
}

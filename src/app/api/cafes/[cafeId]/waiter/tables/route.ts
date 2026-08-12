import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { CafeRole } from "@prisma/client";

const WAITER_ROLES: CafeRole[] = [
  CafeRole.OWNER,
  CafeRole.MANAGER,
  CafeRole.WAITER,
  CafeRole.CASHIER,
];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId, WAITER_ROLES);
  if (!access.ok) return access.response;

  const tables = await prisma.table.findMany({
    where: { cafeId, isActive: true },
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      name: true,
      status: true,
      zone: true,
    },
  });

  return NextResponse.json({ tables });
}

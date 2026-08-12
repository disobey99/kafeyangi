import { NextRequest, NextResponse } from "next/server";
import { requireCafeStaff } from "@/lib/cafe-access";
import { getClosedTableHistory } from "@/lib/table-history";
import { CafeRole } from "@prisma/client";

const STAFF_ROLES: CafeRole[] = [
  CafeRole.OWNER,
  CafeRole.MANAGER,
  CafeRole.WAITER,
  CafeRole.CASHIER,
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId, STAFF_ROLES);
  if (!access.ok) return access.response;

  const tableParam = request.nextUrl.searchParams.get("table");
  const daysParam = request.nextUrl.searchParams.get("days");

  const tableNumber = tableParam ? parseInt(tableParam, 10) : undefined;
  const days = daysParam ? parseInt(daysParam, 10) : 1;

  if (tableParam && Number.isNaN(tableNumber!)) {
    return NextResponse.json({ error: "Stol raqami noto'g'ri" }, { status: 400 });
  }

  const sessions = await getClosedTableHistory(cafeId, {
    tableNumber: Number.isNaN(tableNumber!) ? undefined : tableNumber,
    days: Number.isNaN(days) || days < 1 ? 1 : Math.min(days, 30),
  });

  return NextResponse.json({ sessions });
}

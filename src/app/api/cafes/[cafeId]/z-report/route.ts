import { CafeRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireCafeStaff } from "@/lib/cafe-access";
import { getZReport } from "@/lib/z-report";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId, [
    CafeRole.OWNER,
    CafeRole.MANAGER,
    CafeRole.CASHIER,
  ]);
  if (!access.ok) return access.response;

  const date = request.nextUrl.searchParams.get("date") || undefined;

  try {
    const data = await getZReport(cafeId, date);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Z-hisobot xatosi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

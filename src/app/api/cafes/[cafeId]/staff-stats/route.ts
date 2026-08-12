import { NextResponse } from "next/server";
import { requireCafeManager } from "@/lib/cafe-access";
import { getStaffStats } from "@/lib/staff-stats";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const period =
    new URL(request.url).searchParams.get("period") === "day" ? "day" : "week";

  const stats = await getStaffStats(cafeId, period);
  return NextResponse.json(stats);
}

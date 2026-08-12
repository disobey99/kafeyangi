import { NextResponse } from "next/server";
import { requireCafeManager } from "@/lib/cafe-access";
import { getShiftComparison } from "@/lib/shift-comparison";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const data = await getShiftComparison(cafeId);
  return NextResponse.json(data);
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCafeManager } from "@/lib/cafe-access";
import { syncMenuFromMainBranch } from "@/lib/branch-menu-sync";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const result = await syncMenuFromMainBranch(cafeId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}

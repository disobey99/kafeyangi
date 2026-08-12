import { NextRequest, NextResponse } from "next/server";
import { DashboardTheme } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import { DASHBOARD_THEMES } from "@/lib/dashboard-themes";

const patchSchema = z.object({
  theme: z.enum(["CLASSIC", "MODERN", "PREMIUM"]),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: { dashboardTheme: true },
  });

  const feature = await checkPlanFeature(cafeId, "customDashboardTheme");

  return NextResponse.json({
    theme: cafe?.dashboardTheme ?? "CLASSIC",
    canCustomize: feature.ok,
    themes: DASHBOARD_THEMES,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;

    const feature = await checkPlanFeature(cafeId, "customDashboardTheme");
    if (!feature.ok) {
      return NextResponse.json({ error: feature.error }, { status: 403 });
    }

    const { theme } = patchSchema.parse(await request.json());

    const cafe = await prisma.cafe.update({
      where: { id: cafeId },
      data: { dashboardTheme: theme as DashboardTheme },
      select: { dashboardTheme: true },
    });

    return NextResponse.json({ theme: cafe.dashboardTheme });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

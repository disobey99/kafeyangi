import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyPlatformSubscriptionPatch } from "@/lib/plan-access";
import { parseDbDate, toIsoDate } from "@/lib/parse-db-date";
import { requirePlatformApiPermission } from "@/lib/session-guard";

const schema = z.object({
  plan: z.enum(["STARTER", "STANDARD", "PRO"]),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"]).optional(),
  extendDays: z.number().int().min(1).max(365).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const access = await requirePlatformApiPermission("action.cafes.manage");
  if (!access.ok) return access.response;

  try {
    const { cafeId } = await params;
    const body = schema.parse(await request.json());

    const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
    if (!cafe) {
      return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    }

    const data: {
      plan: SubscriptionPlan;
      status?: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
      trialEndsAt?: Date | null;
      subscriptionEndsAt?: Date;
    } = {
      plan: body.plan as SubscriptionPlan,
    };

    if (body.status) {
      data.status = body.status;
    }

    if (body.extendDays) {
      const currentEnd = parseDbDate(cafe.subscriptionEndsAt);
      const base =
        currentEnd && currentEnd > new Date() ? currentEnd : new Date();
      data.subscriptionEndsAt = new Date(
        base.getTime() + body.extendDays * 24 * 60 * 60 * 1000,
      );
      data.status = "ACTIVE";
    }

    applyPlatformSubscriptionPatch(
      {
        status: cafe.status,
        trialEndsAt: cafe.trialEndsAt,
        subscriptionEndsAt: cafe.subscriptionEndsAt,
      },
      {
        status: body.status,
        plan: body.plan,
        extendDays: body.extendDays,
      },
      data,
    );

    const updated = await prisma.cafe.update({
      where: { id: cafeId },
      data,
    });

    return NextResponse.json({
      cafe: {
        ...updated,
        trialEndsAt: toIsoDate(updated.trialEndsAt),
        subscriptionEndsAt: toIsoDate(updated.subscriptionEndsAt),
      },
    });
  } catch (error) {
    console.error("platform cafe plan patch:", error);
    return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }
}

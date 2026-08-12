import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { isPromoActiveNow, promoLabel } from "@/lib/promo";
import type { PromoChannel } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const channelParam = request.nextUrl.searchParams.get("channel");
  const channel =
    channelParam === "BANNER" || channelParam === "DISCOUNT"
      ? (channelParam as PromoChannel)
      : null;

  const promos = await prisma.promotion.findMany({
    where: {
      cafeId,
      ...(channel ? { channel } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    promotions: promos.map((p) => ({
      ...p,
      label: promoLabel(p.type, p.value),
      activeNow: isPromoActiveNow(p),
    })),
  });
}

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().positive(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  slot: z.number().int().min(1).max(3).nullable().optional(),
  isActive: z.boolean().optional(),
  channel: z.enum(["BANNER", "DISCOUNT"]).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;

    const body = schema.parse(await request.json());

    if (body.type === "PERCENT" && body.value > 100) {
      return NextResponse.json(
        { error: "Foiz 100 dan oshmasligi kerak" },
        { status: 400 },
      );
    }

    const value =
      body.type === "FIXED" ? Math.round(body.value * 100) : Math.round(body.value);

    const channel: PromoChannel =
      body.channel ??
      (body.imageUrl || body.slot ? "BANNER" : "DISCOUNT");

    const promo = await prisma.promotion.create({
      data: {
        cafeId,
        name: body.name,
        type: body.type,
        channel,
        value,
        startTime: body.startTime || null,
        endTime: body.endTime || null,
        imageUrl: body.imageUrl || null,
        productId: body.productId || null,
        slot: body.slot || null,
      },
    });

    return NextResponse.json({ promotion: promo }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }
}

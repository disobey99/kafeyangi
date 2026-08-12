import { NextResponse } from "next/server";
import { z } from "zod";
import { CafeRole } from "@prisma/client";
import { requireCafeStaff } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId, [CafeRole.COURIER]);
  if (!access.ok) return access.response;

  try {
    const body = schema.parse(await request.json());
    const row = await prisma.courierLocation.upsert({
      where: {
        cafeId_userId: { cafeId, userId: access.session.userId },
      },
      create: {
        cafeId,
        userId: access.session.userId,
        latitude: body.latitude,
        longitude: body.longitude,
      },
      update: {
        latitude: body.latitude,
        longitude: body.longitude,
      },
    });
    return NextResponse.json({ ok: true, updatedAt: row.updatedAt });
  } catch {
    return NextResponse.json({ error: "Noto'g'ri koordinata" }, { status: 400 });
  }
}

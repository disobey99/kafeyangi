import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { deleteLocalUpload, replaceLocalUpload } from "@/lib/uploads";

const schema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(1).optional(),
  type: z.enum(["PERCENT", "FIXED"]).optional(),
  value: z.number().positive().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  slot: z.number().int().min(1).max(3).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const promo = await prisma.promotion.findUnique({ where: { id } });
    if (!promo) {
      return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    }

    const access = await requireCafeManager(promo.cafeId);
    if (!access.ok) return access.response;

    const data = schema.parse(await request.json());
    const nextType = data.type ?? promo.type;
    if (nextType === "PERCENT" && data.value != null && data.value > 100) {
      return NextResponse.json(
        { error: "Foiz 100 dan oshmasligi kerak" },
        { status: 400 },
      );
    }

    const updateData = {
      ...data,
      ...(data.value !== undefined
        ? {
            value:
              nextType === "FIXED"
                ? Math.round(data.value * 100)
                : Math.round(data.value),
          }
        : {}),
    };

    const updated = await prisma.promotion.update({
      where: { id },
      data: updateData,
    });

    if (data.imageUrl !== undefined) {
      await replaceLocalUpload(promo.imageUrl, data.imageUrl || null, promo.cafeId);
    }

    return NextResponse.json({ promotion: updated });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const promo = await prisma.promotion.findUnique({ where: { id } });
  if (!promo) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  const access = await requireCafeManager(promo.cafeId);
  if (!access.ok) return access.response;

  await prisma.promotion.delete({ where: { id } });
  if (promo.imageUrl) {
    await deleteLocalUpload(promo.imageUrl, promo.cafeId);
  }
  return NextResponse.json({ ok: true });
}

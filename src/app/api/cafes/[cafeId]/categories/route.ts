import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";

const schema = z.object({
  name: z.string().min(1),
  nameRu: z.string().nullable().optional(),
  nameEn: z.string().nullable().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;

    const body = schema.parse(await request.json());

    const last = await prisma.category.findFirst({
      where: { cafeId },
      orderBy: { sortOrder: "desc" },
    });

    const category = await prisma.category.create({
      data: {
        cafeId,
        name: body.name,
        nameRu: body.nameRu ?? null,
        nameEn: body.nameEn ?? null,
        sortOrder: (last?.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCategoryAccess } from "@/lib/cafe-access";

const schema = z.object({
  name: z.string().min(1).optional(),
  nameRu: z.string().nullable().optional(),
  nameEn: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await requireCategoryAccess(id);
    if (!access.ok) return access.response;

    const data = schema.parse(await request.json());

    const category = await prisma.category.update({
      where: { id },
      data,
    });

    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireCategoryAccess(id);
  if (!access.ok) return access.response;

  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: "Avval kategoriyadagi mahsulotlarni o'chiring" },
      { status: 400 }
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

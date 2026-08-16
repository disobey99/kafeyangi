import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import { uniqueShopSlug } from "@/lib/shop-admin";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requirePlatformApiPermission("action.shopping.manage");
  if (!access.ok) return access.response;
  const { id } = await params;
  try {
    const body = patchSchema.parse(await request.json());
    const existing = await prisma.shopCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    }
    const slug = body.name
      ? await uniqueShopSlug(body.name, "category", id)
      : undefined;
    const updated = await prisma.shopCategory.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim(), slug } : {}),
        ...(body.description !== undefined
          ? { description: body.description?.trim() || null }
          : {}),
        ...(body.imageUrl !== undefined
          ? { imageUrl: body.imageUrl?.trim() || null }
          : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });
    return NextResponse.json({ category: updated });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma’lumot noto‘g‘ri" }, { status: 400 });
    }
    console.error("[shopping/categories PATCH]", e);
    return NextResponse.json({ error: "Yangilanmadi" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requirePlatformApiPermission("action.shopping.manage");
  if (!access.ok) return access.response;
  const { id } = await params;
  try {
    await prisma.shopCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[shopping/categories DELETE]", e);
    return NextResponse.json({ error: "O‘chirilmadi" }, { status: 500 });
  }
}

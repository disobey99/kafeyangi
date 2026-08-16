import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import { uniqueShopSlug } from "@/lib/shop-admin";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const access = await requirePlatformApiPermission("menu.shopping");
  if (!access.ok) return access.response;
  const rows = await prisma.shopCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ categories: rows });
}

export async function POST(request: NextRequest) {
  const access = await requirePlatformApiPermission("action.shopping.manage");
  if (!access.ok) return access.response;
  try {
    const body = createSchema.parse(await request.json());
    const slug = await uniqueShopSlug(body.name, "category");
    const created = await prisma.shopCategory.create({
      data: {
        name: body.name.trim(),
        slug,
        description: body.description?.trim() || null,
        imageUrl: body.imageUrl?.trim() || null,
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json({ category: created }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma’lumot noto‘g‘ri" }, { status: 400 });
    }
    console.error("[shopping/categories POST]", e);
    return NextResponse.json({ error: "Yaratilmadi" }, { status: 500 });
  }
}

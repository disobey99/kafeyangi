import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import { somToTiyin, uniqueShopSlug } from "@/lib/shop-admin";
import {
  applyShopStockChange,
  ensureShopStockTables,
} from "@/lib/shop-stock";

const patchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(5000).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  priceSom: z.number().min(0).optional(),
  compareAtSom: z.number().min(0).optional().nullable(),
  stock: z.number().int().min(0).optional(),
  lowStockAt: z.number().int().min(0).optional(),
  sku: z.string().max(80).optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requirePlatformApiPermission("action.shopping.manage");
  if (!access.ok) return access.response;
  const { id } = await params;
  try {
    await ensureShopStockTables();
    const body = patchSchema.parse(await request.json());
    const existing = await prisma.shopProduct.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    }
    const slug = body.name
      ? await uniqueShopSlug(body.name, "product", id)
      : undefined;

    if (body.stock !== undefined && body.stock !== existing.stock) {
      await applyShopStockChange({
        productId: id,
        type: "ADJUST",
        qty: body.stock,
        note: "Mahsulot formasidan qoldiq tuzatish",
        actorUserId: access.session.userId,
      });
    }

    const updated = await prisma.shopProduct.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim(), slug } : {}),
        ...(body.description !== undefined
          ? { description: body.description?.trim() || null }
          : {}),
        ...(body.imageUrl !== undefined
          ? { imageUrl: body.imageUrl?.trim() || null }
          : {}),
        ...(body.categoryId !== undefined
          ? { categoryId: body.categoryId || null }
          : {}),
        ...(body.priceSom !== undefined
          ? { price: somToTiyin(body.priceSom) }
          : {}),
        ...(body.compareAtSom !== undefined
          ? {
              compareAtPrice:
                body.compareAtSom == null
                  ? null
                  : somToTiyin(body.compareAtSom),
            }
          : {}),
        ...(body.lowStockAt !== undefined
          ? { lowStockAt: body.lowStockAt }
          : {}),
        ...(body.sku !== undefined ? { sku: body.sku?.trim() || null } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.featured !== undefined ? { featured: body.featured } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      },
      include: { category: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ product: updated });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma’lumot noto‘g‘ri" }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Yangilanmadi";
    console.error("[shopping/products PATCH]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
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
    await prisma.shopProduct.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[shopping/products DELETE]", e);
    return NextResponse.json({ error: "O‘chirilmadi" }, { status: 500 });
  }
}

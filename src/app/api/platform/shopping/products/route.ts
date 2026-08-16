import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import { somToTiyin, uniqueShopSlug } from "@/lib/shop-admin";
import {
  applyShopStockChange,
  ensureShopStockTables,
} from "@/lib/shop-stock";

const createSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(5000).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  /** So‘m — istalgan butun / kasr narx */
  priceSom: z.number().min(0),
  compareAtSom: z.number().min(0).optional().nullable(),
  stock: z.number().int().min(0).optional(),
  lowStockAt: z.number().int().min(0).optional(),
  sku: z.string().max(80).optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  const access = await requirePlatformApiPermission("menu.shopping");
  if (!access.ok) return access.response;
  const status = request.nextUrl.searchParams.get("status");
  const rows = await prisma.shopProduct.findMany({
    where:
      status === "DRAFT" || status === "ACTIVE" || status === "ARCHIVED"
        ? { status }
        : undefined,
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: {
      category: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ products: rows });
}

export async function POST(request: NextRequest) {
  const access = await requirePlatformApiPermission("action.shopping.manage");
  if (!access.ok) return access.response;
  try {
    const body = createSchema.parse(await request.json());
    const slug = await uniqueShopSlug(body.name, "product");
    const price = somToTiyin(body.priceSom);
    const compareAtPrice =
      body.compareAtSom != null ? somToTiyin(body.compareAtSom) : null;
    await ensureShopStockTables();
    const initialStock = body.stock ?? 0;
    const created = await prisma.shopProduct.create({
      data: {
        name: body.name.trim(),
        slug,
        description: body.description?.trim() || null,
        imageUrl: body.imageUrl?.trim() || null,
        categoryId: body.categoryId || null,
        price,
        compareAtPrice,
        stock: 0,
        lowStockAt: body.lowStockAt ?? 5,
        sku: body.sku?.trim() || null,
        status: body.status ?? "DRAFT",
        featured: body.featured ?? false,
        sortOrder: body.sortOrder ?? 0,
      },
      include: { category: { select: { id: true, name: true } } },
    });
    if (initialStock > 0) {
      await applyShopStockChange({
        productId: created.id,
        type: "IN",
        qty: initialStock,
        note: "Boshlang‘ich ombor",
        actorUserId: access.session.userId,
      });
    }
    const product = await prisma.shopProduct.findUnique({
      where: { id: created.id },
      include: { category: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma’lumot noto‘g‘ri" }, { status: 400 });
    }
    console.error("[shopping/products POST]", e);
    return NextResponse.json({ error: "Yaratilmadi" }, { status: 500 });
  }
}

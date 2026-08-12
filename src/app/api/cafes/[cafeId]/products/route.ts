import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { checkPlanLimit, checkPlanFeature } from "@/lib/plan-access";
import { MENU_FOOD_TAG_ID_VALUES } from "@/lib/menu-food-tags";

const schema = z.object({
  categoryId: z.string(),
  name: z.string().min(1),
  nameRu: z.string().nullable().optional(),
  nameEn: z.string().nullable().optional(),
  description: z.string().optional(),
  descriptionRu: z.string().nullable().optional(),
  descriptionEn: z.string().nullable().optional(),
  priceSom: z.number().positive(),
  imageUrl: z
    .union([z.string().max(800), z.literal(""), z.null()])
    .optional()
    .refine(
      (v) =>
        v === undefined ||
        v === null ||
        v === "" ||
        v.startsWith("/uploads/") ||
        /^https?:\/\//i.test(v),
      { message: "Rasm URL yoki /uploads/..." },
    ),
  trackStock: z.boolean().optional(),
  stockQty: z.number().int().min(0).nullable().optional(),
  menuTag: z.enum(MENU_FOOD_TAG_ID_VALUES).nullable().optional(),
  prepStationId: z.string().nullable().optional(),
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

    const category = await prisma.category.findFirst({
      where: { id: body.categoryId, cafeId },
    });
    if (!category) {
      return NextResponse.json({ error: "Kategoriya topilmadi" }, { status: 404 });
    }

    const limit = await checkPlanLimit(cafeId, "products");
    if (!limit.ok) {
      return NextResponse.json({ error: limit.error }, { status: 403 });
    }

    if (body.trackStock) {
      const stockFeature = await checkPlanFeature(cafeId, "inventoryRation");
      if (!stockFeature.ok) {
        return NextResponse.json({ error: stockFeature.error }, { status: 403 });
      }
    }

    if (body.prepStationId) {
      const station = await prisma.prepStation.findFirst({
        where: { id: body.prepStationId, cafeId, isActive: true },
      });
      if (!station) {
        return NextResponse.json({ error: "Stansiya topilmadi" }, { status: 404 });
      }
    }

    const last = await prisma.product.findFirst({
      where: { categoryId: body.categoryId },
      orderBy: { sortOrder: "desc" },
    });

    const product = await prisma.product.create({
      data: {
        cafeId,
        categoryId: body.categoryId,
        name: body.name,
        nameRu: body.nameRu ?? null,
        nameEn: body.nameEn ?? null,
        description: body.description || null,
        descriptionRu: body.descriptionRu ?? null,
        descriptionEn: body.descriptionEn ?? null,
        price: Math.round(body.priceSom * 100),
        imageUrl: body.imageUrl || null,
        menuTag: body.menuTag ?? null,
        prepStationId: body.prepStationId ?? null,
        trackStock: body.trackStock ?? false,
        stockQty: body.stockQty ?? null,
        isAvailable: body.trackStock && body.stockQty != null ? body.stockQty > 0 : true,
        sortOrder: (last?.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;

    const products = await prisma.product.findMany({
      where: { cafeId },
      orderBy: { sortOrder: "asc" },
      include: {
        category: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

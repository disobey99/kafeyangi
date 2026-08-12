import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProductAccess } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";
import { MENU_FOOD_TAG_ID_VALUES } from "@/lib/menu-food-tags";
import { deleteLocalUpload, replaceLocalUpload } from "@/lib/uploads";

const imageUrlField = z
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
  );

const schema = z.object({
  name: z.string().min(1).optional(),
  nameRu: z.string().nullable().optional(),
  nameEn: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  descriptionRu: z.string().nullable().optional(),
  descriptionEn: z.string().nullable().optional(),
  priceSom: z.number().positive().optional(),
  discountPriceSom: z.number().nullable().optional(),
  imageUrl: imageUrlField,
  categoryId: z.string().optional(),
  isAvailable: z.boolean().optional(),
  trackStock: z.boolean().optional(),
  stockQty: z.number().int().min(0).nullable().optional(),
  menuTag: z.enum(MENU_FOOD_TAG_ID_VALUES).nullable().optional(),
  prepStationId: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await requireProductAccess(id);
    if (!access.ok) return access.response;

    const body = schema.parse(await request.json());

    if (body.trackStock) {
      const stockFeature = await checkPlanFeature(access.cafe.id, "inventoryRation");
      if (!stockFeature.ok) {
        return NextResponse.json({ error: stockFeature.error }, { status: 403 });
      }
    }

    if (body.categoryId) {
      const cat = await prisma.category.findFirst({
        where: { id: body.categoryId, cafeId: access.cafe.id },
      });
      if (!cat) {
        return NextResponse.json({ error: "Kategoriya topilmadi" }, { status: 404 });
      }
    }

    if (body.prepStationId) {
      const station = await prisma.prepStation.findFirst({
        where: { id: body.prepStationId, cafeId: access.cafe.id, isActive: true },
      });
      if (!station) {
        return NextResponse.json({ error: "Stansiya topilmadi" }, { status: 404 });
      }
    }

    const existing =
      body.imageUrl !== undefined
        ? await prisma.product.findUnique({
            where: { id },
            select: { imageUrl: true },
          })
        : null;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.nameRu !== undefined && { nameRu: body.nameRu }),
        ...(body.nameEn !== undefined && { nameEn: body.nameEn }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.descriptionRu !== undefined && { descriptionRu: body.descriptionRu }),
        ...(body.descriptionEn !== undefined && { descriptionEn: body.descriptionEn }),
        ...(body.priceSom !== undefined && { price: Math.round(body.priceSom * 100) }),
        ...(body.discountPriceSom !== undefined && {
          discountPrice: body.discountPriceSom !== null ? Math.round(body.discountPriceSom * 100) : null,
        }),
        ...(body.imageUrl !== undefined && {
          imageUrl: body.imageUrl || null,
        }),
        ...(body.menuTag !== undefined && { menuTag: body.menuTag }),
        ...(body.prepStationId !== undefined && { prepStationId: body.prepStationId }),
        ...(body.categoryId && { categoryId: body.categoryId }),
        ...(body.isAvailable !== undefined && { isAvailable: body.isAvailable }),
        ...(body.trackStock !== undefined && { trackStock: body.trackStock }),
        ...(body.stockQty !== undefined && {
          stockQty: body.stockQty,
          ...(body.stockQty !== null && body.stockQty <= 0 && { isAvailable: false }),
          ...(body.stockQty !== null && body.stockQty > 0 && body.trackStock && { isAvailable: true }),
        }),
      },
    });

    if (body.imageUrl !== undefined && existing) {
      await replaceLocalUpload(
        existing.imageUrl,
        body.imageUrl || null,
        access.cafe.id,
      );
    }

    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireProductAccess(id);
  if (!access.ok) return access.response;

  const existing = await prisma.product.findUnique({
    where: { id },
    select: { imageUrl: true },
  });

  const orderCount = await prisma.orderItem.count({ where: { productId: id } });
  if (orderCount > 0) {
    await prisma.product.update({
      where: { id },
      data: { isAvailable: false },
    });
    return NextResponse.json({
      ok: true,
      message: "Buyurtmalarda bor — faqat yashirildi",
    });
  }

  await prisma.product.delete({ where: { id } });
  if (existing?.imageUrl) {
    await deleteLocalUpload(existing.imageUrl, access.cafe.id);
  }
  return NextResponse.json({ ok: true });
}

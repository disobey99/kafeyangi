import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { checkPlanLimit } from "@/lib/plan-access";
import { getMenuTemplateById } from "@/lib/menu-template-catalog";
import { MENU_FOOD_TAG_ID_VALUES } from "@/lib/menu-food-tags";

const schema = z.object({
  items: z
    .array(
      z.object({
        templateId: z.string(),
        categoryId: z.string().optional(),
        name: z.string().min(1).optional(),
        priceSom: z.number().positive().optional(),
      }),
    )
    .min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;

    const body = schema.parse(await request.json());
    const created: { id: string; name: string; categoryId: string }[] = [];

    const categories = await prisma.category.findMany({
      where: { cafeId },
      orderBy: { sortOrder: "asc" },
    });

    async function resolveCategory(
      categoryId: string | undefined,
      categoryHint: string,
    ): Promise<string> {
      if (categoryId) {
        const existing = categories.find((c) => c.id === categoryId);
        if (existing) return existing.id;
      }

      const byName = categories.find(
        (c) => c.name.toLowerCase() === categoryHint.toLowerCase(),
      );
      if (byName) return byName.id;

      const last = categories[categories.length - 1];
      const cat = await prisma.category.create({
        data: {
          cafeId,
          name: categoryHint,
          sortOrder: (last?.sortOrder ?? 0) + 1,
        },
      });
      categories.push(cat);
      return cat.id;
    }

    for (const item of body.items) {
      const template = getMenuTemplateById(item.templateId);
      if (!template) {
        return NextResponse.json(
          { error: `Shablon topilmadi: ${item.templateId}` },
          { status: 400 },
        );
      }

      const limit = await checkPlanLimit(cafeId, "products");
      if (!limit.ok) {
        return NextResponse.json({ error: limit.error }, { status: 403 });
      }

      const categoryId = await resolveCategory(item.categoryId, template.categoryHint);
      const name = item.name?.trim() || template.name;
      const priceSom = item.priceSom ?? template.suggestedPriceSom;

      const lastProduct = await prisma.product.findFirst({
        where: { categoryId },
        orderBy: { sortOrder: "desc" },
      });

      const menuTag = MENU_FOOD_TAG_ID_VALUES.includes(template.menuTag)
        ? template.menuTag
        : null;

      const productData = {
        cafeId,
        categoryId,
        name,
        nameRu: template.nameRu,
        nameEn: template.nameEn,
        description: template.description,
        descriptionRu: template.descriptionRu,
        descriptionEn: template.descriptionEn,
        price: Math.round(priceSom * 100),
        isAvailable: true,
        sortOrder: (lastProduct?.sortOrder ?? 0) + 1,
      };

      let product;
      try {
        product = await prisma.product.create({
          data: { ...productData, menuTag },
        });
      } catch (tagErr) {
        // menuTag ustuni migratsiyasi qo'llanmagan bo'lsa ham import ishlashi kerak
        try {
          product = await prisma.product.create({ data: productData });
        } catch (retryErr) {
          const message =
            retryErr instanceof Error ? retryErr.message : "Mahsulot yaratib bo'lmadi";
          return NextResponse.json({ error: message }, { status: 400 });
        }
        void tagErr;
      }

      created.push({ id: product.id, name: product.name, categoryId });
    }

    return NextResponse.json({ ok: true, created, count: created.length }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Tanlangan taomlar noto'g'ri" }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Ma'lumotlar noto'g'ri";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

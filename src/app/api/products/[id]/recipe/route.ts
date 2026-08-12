import { NextRequest, NextResponse } from "next/server";
import { UnitCode } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProductAccess } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";

const itemSchema = z.object({
  rawMaterialId: z.string(),
  unit: z.nativeEnum(UnitCode),
  qty: z.number().int().positive(),
  qtyBase: z.number().int().positive(),
  wastagePct: z.number().int().min(0).max(100).optional(),
});

const upsertSchema = z.object({
  outputQty: z.number().int().positive().optional(),
  outputUnit: z.nativeEnum(UnitCode).optional(),
  note: z.string().optional(),
  isActive: z.boolean().optional(),
  items: z.array(itemSchema).min(1),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireProductAccess(id);
  if (!access.ok) return access.response;

  const feature = await checkPlanFeature(access.cafe.id, "inventoryRation");
  if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

  const recipe = await prisma.recipe.findUnique({
    where: { productId: id },
    include: {
      items: {
        include: { rawMaterial: { select: { name: true, baseUnit: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return NextResponse.json({ recipe });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const access = await requireProductAccess(id);
    if (!access.ok) return access.response;

    const feature = await checkPlanFeature(access.cafe.id, "inventoryRation");
    if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

    const body = upsertSchema.parse(await request.json());

    const recipe = await prisma.$transaction(async (tx) => {
      const upserted = await tx.recipe.upsert({
        where: { productId: id },
        update: {
          outputQty: body.outputQty ?? 1,
          outputUnit: body.outputUnit ?? UnitCode.PC,
          note: body.note ?? null,
          isActive: body.isActive ?? true,
        },
        create: {
          cafeId: access.cafe.id,
          productId: id,
          outputQty: body.outputQty ?? 1,
          outputUnit: body.outputUnit ?? UnitCode.PC,
          note: body.note ?? null,
          isActive: body.isActive ?? true,
        },
      });

      await tx.recipeItem.deleteMany({ where: { recipeId: upserted.id } });
      await tx.recipeItem.createMany({
        data: body.items.map((item) => ({
          cafeId: access.cafe.id,
          recipeId: upserted.id,
          rawMaterialId: item.rawMaterialId,
          unit: item.unit,
          qty: item.qty,
          qtyBase: item.qtyBase,
          wastagePct: item.wastagePct ?? 0,
        })),
      });

      return tx.recipe.findUnique({
        where: { id: upserted.id },
        include: { items: true },
      });
    });

    return NextResponse.json({ recipe });
  } catch {
    return NextResponse.json({ error: "Retsept ma'lumotlari noto'g'ri" }, { status: 400 });
  }
}


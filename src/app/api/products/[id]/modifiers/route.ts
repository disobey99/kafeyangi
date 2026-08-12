import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager, requireProductAccess } from "@/lib/cafe-access";

const optionSchema = z.object({
  name: z.string().trim().min(1, "Variant nomi kerak"),
  nameRu: z.string().nullable().optional(),
  nameEn: z.string().nullable().optional(),
  priceDeltaSom: z.coerce.number().min(0).default(0),
});

const groupSchema = z.object({
  name: z.string().trim().min(1, "Guruh nomi kerak (masalan: Hajm)"),
  nameRu: z.string().nullable().optional(),
  nameEn: z.string().nullable().optional(),
  required: z.boolean().optional(),
  minSelect: z.number().int().min(0).optional(),
  maxSelect: z.number().int().min(1).optional(),
  options: z.array(optionSchema).min(1, "Kamida bitta variant qo'shing"),
});

function formatZodError(error: z.ZodError) {
  const first = error.issues[0];
  return first?.message ?? "Ma'lumotlar noto'g'ri";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: productId } = await params;
    const access = await requireProductAccess(productId);
    if (!access.ok) return access.response;

    const groups = await prisma.productModifierGroup.findMany({
      where: { productId },
      include: { options: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ groups });
  } catch (e) {
    console.error("modifiers GET", e);
    return NextResponse.json({ error: "Server xatosi", groups: [] }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: productId } = await params;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });

    const access = await requireCafeManager(product.cafeId);
    if (!access.ok) return access.response;

    const raw = await request.json();
    const parsed = z.object({ groups: z.array(groupSchema) }).safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { groups } = parsed.data;

    await prisma.productModifierGroup.deleteMany({ where: { productId } });

    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      await prisma.productModifierGroup.create({
        data: {
          productId,
          name: g.name.trim(),
          nameRu: g.nameRu?.trim() || null,
          nameEn: g.nameEn?.trim() || null,
          required: g.required ?? false,
          minSelect: g.required ? Math.max(1, g.minSelect ?? 1) : (g.minSelect ?? 0),
          maxSelect: g.maxSelect ?? 1,
          sortOrder: gi,
          options: {
            create: g.options.map((o, oi) => ({
              name: o.name.trim(),
              nameRu: o.nameRu?.trim() || null,
              nameEn: o.nameEn?.trim() || null,
              priceDelta: Math.round(o.priceDeltaSom * 100),
              sortOrder: oi,
            })),
          },
        },
      });
    }

    const saved = await prisma.productModifierGroup.findMany({
      where: { productId },
      include: { options: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ groups: saved });
  } catch (e) {
    console.error("modifiers PUT", e);
    const msg = e instanceof Error ? e.message : "Saqlash xatosi";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

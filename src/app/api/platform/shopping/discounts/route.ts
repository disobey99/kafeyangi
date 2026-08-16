import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import { somToTiyin } from "@/lib/shop-admin";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().max(40).optional().nullable(),
  type: z.enum(["PERCENT", "FIXED"]),
  /** PERCENT: 1–100; FIXED: so‘m */
  value: z.number().positive(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
  minOrderSom: z.number().min(0).optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  productIds: z.array(z.string()).optional(),
});

export async function GET() {
  const access = await requirePlatformApiPermission("menu.shopping");
  if (!access.ok) return access.response;
  const rows = await prisma.shopDiscount.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      products: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
  });
  return NextResponse.json({ discounts: rows });
}

export async function POST(request: NextRequest) {
  const access = await requirePlatformApiPermission("action.shopping.manage");
  if (!access.ok) return access.response;
  try {
    const body = createSchema.parse(await request.json());
    if (body.type === "PERCENT" && (body.value < 1 || body.value > 100)) {
      return NextResponse.json(
        { error: "Foiz 1–100 oralig‘ida bo‘lsin" },
        { status: 400 },
      );
    }
    const value =
      body.type === "PERCENT" ? Math.round(body.value) : somToTiyin(body.value);
    const created = await prisma.shopDiscount.create({
      data: {
        name: body.name.trim(),
        code: body.code?.trim().toUpperCase() || null,
        type: body.type,
        value,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        isActive: body.isActive ?? true,
        minOrderAmount:
          body.minOrderSom != null ? somToTiyin(body.minOrderSom) : null,
        maxUses: body.maxUses ?? null,
        products: body.productIds?.length
          ? {
              create: body.productIds.map((productId) => ({ productId })),
            }
          : undefined,
      },
      include: {
        products: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });
    return NextResponse.json({ discount: created }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma’lumot noto‘g‘ri" }, { status: 400 });
    }
    console.error("[shopping/discounts POST]", e);
    return NextResponse.json({ error: "Yaratilmadi" }, { status: 500 });
  }
}

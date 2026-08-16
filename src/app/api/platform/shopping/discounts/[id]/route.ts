import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import { somToTiyin } from "@/lib/shop-admin";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  code: z.string().max(40).optional().nullable(),
  type: z.enum(["PERCENT", "FIXED"]).optional(),
  value: z.number().positive().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
  minOrderSom: z.number().min(0).optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  productIds: z.array(z.string()).optional(),
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
    const existing = await prisma.shopDiscount.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    }
    const type = body.type ?? existing.type;
    let value = existing.value;
    if (body.value !== undefined) {
      if (type === "PERCENT" && (body.value < 1 || body.value > 100)) {
        return NextResponse.json(
          { error: "Foiz 1–100 oralig‘ida bo‘lsin" },
          { status: 400 },
        );
      }
      value =
        type === "PERCENT" ? Math.round(body.value) : somToTiyin(body.value);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.productIds) {
        await tx.shopDiscountProduct.deleteMany({ where: { discountId: id } });
        if (body.productIds.length) {
          await tx.shopDiscountProduct.createMany({
            data: body.productIds.map((productId) => ({
              discountId: id,
              productId,
            })),
          });
        }
      }
      return tx.shopDiscount.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.code !== undefined
            ? { code: body.code?.trim().toUpperCase() || null }
            : {}),
          ...(body.type !== undefined ? { type: body.type } : {}),
          value,
          ...(body.startsAt !== undefined
            ? { startsAt: body.startsAt ? new Date(body.startsAt) : null }
            : {}),
          ...(body.endsAt !== undefined
            ? { endsAt: body.endsAt ? new Date(body.endsAt) : null }
            : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          ...(body.minOrderSom !== undefined
            ? {
                minOrderAmount:
                  body.minOrderSom == null
                    ? null
                    : somToTiyin(body.minOrderSom),
              }
            : {}),
          ...(body.maxUses !== undefined ? { maxUses: body.maxUses } : {}),
        },
        include: {
          products: {
            include: { product: { select: { id: true, name: true } } },
          },
        },
      });
    });
    return NextResponse.json({ discount: updated });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma’lumot noto‘g‘ri" }, { status: 400 });
    }
    console.error("[shopping/discounts PATCH]", e);
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
    await prisma.shopDiscount.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[shopping/discounts DELETE]", e);
    return NextResponse.json({ error: "O‘chirilmadi" }, { status: 500 });
  }
}

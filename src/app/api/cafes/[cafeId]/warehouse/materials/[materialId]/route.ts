import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeInventory } from "@/lib/cafe-access";
import { checkPlanFeature } from "@/lib/plan-access";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  minQtyBase: z.number().int().min(0).nullable().optional(),
  reorderQtyBase: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
  trackLots: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string; materialId: string }> },
) {
  try {
    const { cafeId, materialId } = await params;
    const access = await requireCafeInventory(cafeId);
    if (!access.ok) return access.response;
    const feature = await checkPlanFeature(cafeId, "inventoryRation");
    if (!feature.ok) return NextResponse.json({ error: feature.error }, { status: 403 });

    const body = patchSchema.parse(await request.json());
    const existing = await prisma.rawMaterial.findFirst({
      where: { id: materialId, cafeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Xomashyo topilmadi" }, { status: 404 });
    }

    const material = await prisma.rawMaterial.update({
      where: { id: materialId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.minQtyBase !== undefined ? { minQtyBase: body.minQtyBase } : {}),
        ...(body.reorderQtyBase !== undefined ? { reorderQtyBase: body.reorderQtyBase } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.trackLots !== undefined ? { trackLots: body.trackLots } : {}),
      },
    });
    return NextResponse.json({ material });
  } catch {
    return NextResponse.json({ error: "Yangilashda xatolik" }, { status: 400 });
  }
}

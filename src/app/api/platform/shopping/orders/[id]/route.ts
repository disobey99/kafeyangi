import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import {
  ensureShopStockTables,
  restoreShopOrderStock,
} from "@/lib/shop-stock";

const patchSchema = z.object({
  status: z.enum(["NEW", "CONFIRMED", "CANCELLED", "DONE"]),
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
    const body = patchSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Status noto‘g‘ri" }, { status: 400 });
    }

    const existing = await prisma.shopOrder.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    }

    const next = body.data.status;
    if (next === "CANCELLED" && existing.status !== "CANCELLED") {
      await restoreShopOrderStock(id, access.session.userId);
    }

    const order = await prisma.shopOrder.update({
      where: { id },
      data: { status: next },
      include: { items: true },
    });
    return NextResponse.json({ order });
  } catch (e) {
    console.error("[shopping/orders PATCH]", e);
    return NextResponse.json({ error: "Yangilanmadi" }, { status: 500 });
  }
}

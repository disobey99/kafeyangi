import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import { ensureShopOrderTables } from "@/lib/shop-order-tables";

export async function GET() {
  const access = await requirePlatformApiPermission("menu.shopping");
  if (!access.ok) return access.response;

  try {
    await ensureShopOrderTables();
    const orders = await prisma.shopOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            unitPrice: true,
            qty: true,
          },
        },
      },
    });
    const newCount = await prisma.shopOrder.count({ where: { status: "NEW" } });
    return NextResponse.json({ orders, newCount });
  } catch (e) {
    console.error("[shopping/orders GET]", e);
    return NextResponse.json({ orders: [], newCount: 0 });
  }
}

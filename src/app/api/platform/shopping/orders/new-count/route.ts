import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import { ensureShopOrderTables } from "@/lib/shop-order-tables";

export async function GET() {
  const access = await requirePlatformApiPermission("menu.shopping");
  if (!access.ok) return access.response;

  try {
    await ensureShopOrderTables();
    const newCount = await prisma.shopOrder.count({ where: { status: "NEW" } });
    return NextResponse.json({ newCount });
  } catch {
    return NextResponse.json({ newCount: 0 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import { ensureShopStockTables } from "@/lib/shop-stock";

export async function GET(request: NextRequest) {
  const access = await requirePlatformApiPermission("menu.shopping");
  if (!access.ok) return access.response;

  try {
    await ensureShopStockTables();
    const productId = request.nextUrl.searchParams.get("productId")?.trim();
    const take = Math.min(
      200,
      Math.max(1, Number(request.nextUrl.searchParams.get("take") || 80) || 80),
    );

    const movements = await prisma.shopStockMovement.findMany({
      where: productId ? { productId } : undefined,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
    });

    return NextResponse.json({ movements });
  } catch (e) {
    console.error("[shopping/stock/movements]", e);
    // Prisma client eski bo‘lsa — raw
    try {
      const productId = request.nextUrl.searchParams.get("productId")?.trim();
      const rows = productId
        ? await prisma.$queryRaw<
            Array<{
              id: string;
              productId: string;
              type: string;
              qty: number;
              delta: number;
              balanceAfter: number;
              note: string | null;
              orderId: string | null;
              createdAt: Date;
              productName: string;
              sku: string | null;
            }>
          >`
            SELECT m.*, p."name" as "productName", p."sku" as sku
            FROM "ShopStockMovement" m
            JOIN "ShopProduct" p ON p."id" = m."productId"
            WHERE m."productId" = ${productId}
            ORDER BY m."createdAt" DESC
            LIMIT 80
          `
        : await prisma.$queryRaw<
            Array<{
              id: string;
              productId: string;
              type: string;
              qty: number;
              delta: number;
              balanceAfter: number;
              note: string | null;
              orderId: string | null;
              createdAt: Date;
              productName: string;
              sku: string | null;
            }>
          >`
            SELECT m.*, p."name" as "productName", p."sku" as sku
            FROM "ShopStockMovement" m
            JOIN "ShopProduct" p ON p."id" = m."productId"
            ORDER BY m."createdAt" DESC
            LIMIT 80
          `;

      return NextResponse.json({
        movements: rows.map((r) => ({
          id: r.id,
          productId: r.productId,
          type: r.type,
          qty: r.qty,
          delta: r.delta,
          balanceAfter: r.balanceAfter,
          note: r.note,
          orderId: r.orderId,
          createdAt: r.createdAt,
          product: {
            id: r.productId,
            name: r.productName,
            sku: r.sku,
          },
        })),
      });
    } catch (e2) {
      console.error("[shopping/stock/movements raw]", e2);
      return NextResponse.json({ movements: [] });
    }
  }
}

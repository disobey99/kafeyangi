import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import {
  applyShopStockChange,
  ensureShopStockTables,
} from "@/lib/shop-stock";

export async function GET(request: NextRequest) {
  const access = await requirePlatformApiPermission("menu.shopping");
  if (!access.ok) return access.response;

  try {
    await ensureShopStockTables();
    const lowOnly = request.nextUrl.searchParams.get("low") === "1";

    const products = await prisma.shopProduct.findMany({
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        lowStockAt: true,
        status: true,
        category: { select: { name: true } },
      },
    });

    const list = lowOnly
      ? products.filter((p) => p.stock <= p.lowStockAt)
      : products;

    const lowCount = products.filter((p) => p.stock <= p.lowStockAt).length;
    const zeroCount = products.filter((p) => p.stock <= 0).length;
    const totalUnits = products.reduce((s, p) => s + p.stock, 0);

    return NextResponse.json({
      products: list,
      stats: {
        products: products.length,
        lowCount,
        zeroCount,
        totalUnits,
      },
    });
  } catch (e) {
    console.error("[shopping/stock GET]", e);
    return NextResponse.json({ error: "Ombor yuklanmadi" }, { status: 500 });
  }
}

const moveSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(["IN", "OUT", "ADJUST"]),
  qty: z.number().int(),
  note: z.string().max(300).optional().nullable(),
  lowStockAt: z.number().int().min(0).max(1_000_000).optional(),
});

export async function POST(request: NextRequest) {
  const access = await requirePlatformApiPermission("action.shopping.manage");
  if (!access.ok) return access.response;

  try {
    await ensureShopStockTables();
    const body = moveSchema.parse(await request.json());

    if (body.type !== "ADJUST" && body.qty <= 0) {
      return NextResponse.json(
        { error: "Miqdor 0 dan katta bo‘lsin" },
        { status: 400 },
      );
    }
    if (body.type === "ADJUST" && body.qty < 0) {
      return NextResponse.json(
        { error: "Yangi qoldiq manfiy bo‘lmasin" },
        { status: 400 },
      );
    }

    if (body.lowStockAt != null) {
      await prisma.shopProduct.update({
        where: { id: body.productId },
        data: { lowStockAt: body.lowStockAt },
      });
    }

    const result = await applyShopStockChange({
      productId: body.productId,
      type: body.type,
      qty: body.qty,
      note: body.note,
      actorUserId: access.session.userId,
    });

    const product = await prisma.shopProduct.findUnique({
      where: { id: body.productId },
      select: {
        id: true,
        name: true,
        stock: true,
        lowStockAt: true,
        sku: true,
        status: true,
      },
    });

    return NextResponse.json({ ok: true, result, product });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma’lumot noto‘g‘ri" }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "Ombor yangilanmadi";
    console.error("[shopping/stock POST]", e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

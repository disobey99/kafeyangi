import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  autoDiscounts,
  loadActiveShopDiscounts,
  priceCatalogProduct,
} from "@/lib/shop-pricing";

const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 24;

/** Ommaviy katalog — sahifalash + kategoriya + chegirma */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") || 1) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(sp.get("pageSize") || DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE),
    );
    const categoryId = sp.get("categoryId")?.trim() || "";
    const uncategorized = sp.get("uncategorized") === "1";

    const where = {
      status: "ACTIVE" as const,
      ...(categoryId
        ? { categoryId }
        : uncategorized
          ? { categoryId: null }
          : {}),
    };

    const [total, rows, discounts] = await Promise.all([
      prisma.shopProduct.count({ where }),
      prisma.shopProduct.findMany({
        where,
        orderBy: [
          { featured: "desc" },
          { sortOrder: "asc" },
          { name: "asc" },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
          price: true,
          compareAtPrice: true,
          stock: true,
          featured: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      loadActiveShopDiscounts(),
    ]);

    const auto = autoDiscounts(discounts);
    const products = rows.map((p) => priceCatalogProduct(p, auto));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      products,
      page,
      pageSize,
      total,
      totalPages,
    });
  } catch (e) {
    console.error("[shop/products GET]", e);
    return NextResponse.json({
      products: [],
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      total: 0,
      totalPages: 1,
    });
  }
}

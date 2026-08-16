import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Ommaviy faol kategoriyalar */
export async function GET() {
  try {
    const categories = await prisma.shopCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { products: { where: { status: "ACTIVE" } } },
        },
      },
    });
    return NextResponse.json({
      categories: categories
        .filter((c) => c._count.products > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          productCount: c._count.products,
        })),
    });
  } catch (e) {
    console.error("[shop/categories GET]", e);
    return NextResponse.json({ categories: [] });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: productId } = await params;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, cafeId: true, isAvailable: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
  }

  const reviews = await prisma.productReview.findMany({
    where: { productId },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 40,
    select: {
      id: true,
      score: true,
      comment: true,
      createdAt: true,
    },
  });

  const withComment = reviews.filter((r) => r.comment?.trim());
  const list = withComment.length > 0 ? withComment : reviews;

  const avg =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((s, r) => s + r.score, 0) / reviews.length) * 10,
        ) / 10
      : null;

  return NextResponse.json({
    productId,
    avgScore: avg,
    count: reviews.length,
    reviews: list.slice(0, 25),
  });
}

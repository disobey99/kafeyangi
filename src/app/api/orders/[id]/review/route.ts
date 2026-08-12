import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/loyalty";

const schema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  phone: z.string().min(9),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const body = schema.parse(await request.json());
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        cafeId: true,
        status: true,
        customerPhone: true,
        review: { select: { id: true } },
        items: {
          select: { productId: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    }

    if (order.status !== "DELIVERED") {
      return NextResponse.json(
        { error: "Reyting faqat yetkazilgan buyurtmada" },
        { status: 400 },
      );
    }

    if (order.review) {
      return NextResponse.json({ error: "Allaqachon baholangan" }, { status: 409 });
    }

    if (!order.customerPhone) {
      return NextResponse.json({ error: "Telefon topilmadi" }, { status: 400 });
    }

    if (normalizePhone(order.customerPhone) !== normalizePhone(body.phone)) {
      return NextResponse.json({ error: "Telefon mos kelmadi" }, { status: 403 });
    }

    const comment = body.comment?.trim() || null;
    const productIds = [
      ...new Set(order.items.map((i) => i.productId).filter(Boolean)),
    ];

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.orderReview.create({
        data: {
          orderId: order.id,
          cafeId: order.cafeId,
          score: body.score,
          comment,
        },
      });

      if (productIds.length > 0) {
        await tx.productReview.createMany({
          data: productIds.map((productId) => ({
            productId,
            cafeId: order.cafeId,
            orderId: order.id,
            score: body.score,
            comment,
          })),
        });
      }

      return created;
    });

    return NextResponse.json({ review });
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }
}

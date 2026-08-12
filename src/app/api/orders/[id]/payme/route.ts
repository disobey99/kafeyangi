import { NextRequest, NextResponse } from "next/server";
import { createPaymeCheckoutForOrder } from "@/lib/payme";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { cafe: { select: { slug: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { returnUrl?: string };
  const base = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const returnUrl =
    body.returnUrl ??
    `${base}/c/${order.cafe.slug}/app?paid=${order.id}`;

  const result = await createPaymeCheckoutForOrder(order.id, returnUrl);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ checkoutUrl: result.url });
}

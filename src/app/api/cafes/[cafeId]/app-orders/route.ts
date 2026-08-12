import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "").replace(/^998/, "+998");
}

/** Mijoz: telefon bo'yicha buyurtmalar (PWA ↔ Telegram sinxron) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const phoneRaw = request.nextUrl.searchParams.get("phone")?.trim() ?? "";
  if (!phoneRaw || phoneRaw.length < 9) {
    return NextResponse.json({ error: "Telefon kerak" }, { status: 400 });
  }

  const phone = normalizePhone(phoneRaw);
  const digits = phone.replace(/\D/g, "");

  const orders = await prisma.order.findMany({
    where: {
      cafeId,
      OR: [
        { customerPhone: phone },
        { customerPhone: { contains: digits.slice(-9) } },
      ],
      source: "ONLINE",
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      type: true,
      totalAmount: true,
      createdAt: true,
      customerPhone: true,
    },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      type: o.type,
      total: o.totalAmount,
      createdAt: o.createdAt.toISOString(),
      customerPhone: o.customerPhone,
    })),
  });
}

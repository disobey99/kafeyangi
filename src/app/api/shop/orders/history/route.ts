import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureShopOrderTables } from "@/lib/shop-order-tables";
import { normalizeShopPhone, shopPhoneVariants } from "@/lib/shop-phone";

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone")?.trim() ?? "";
  if (normalizeShopPhone(phone).length < 7) {
    return NextResponse.json(
      { error: "Telefon raqamini kiriting (kamida 7 raqam)" },
      { status: 400 },
    );
  }

  try {
    await ensureShopOrderTables();
    const variants = shopPhoneVariants(phone);

    const recent = await prisma.shopOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        customerNote: true,
        status: true,
        total: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            productName: true,
            unitPrice: true,
            qty: true,
          },
        },
      },
    });

    const orders = recent
      .filter((o) => {
        const oDigits = normalizeShopPhone(o.customerPhone);
        return variants.some(
          (v) => oDigits === v || oDigits.endsWith(v) || v.endsWith(oDigits),
        );
      })
      .slice(0, 40)
      .map((o) => ({
        id: o.id,
        status: o.status,
        total: o.total,
        createdAt: o.createdAt,
        customerNote: o.customerNote,
        items: o.items,
      }));

    return NextResponse.json({ orders });
  } catch (e) {
    console.error("[shop/orders/history]", e);
    return NextResponse.json({ error: "Tarix yuklanmadi" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPromoActiveNow } from "@/lib/promo";
import { promoLabel } from "@/lib/promo";

/** Faqat narxga ta'sir qiladigan chegirma (DISCOUNT) — banner emas */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;

  const promos = await prisma.promotion.findMany({
    where: { cafeId, isActive: true, channel: "DISCOUNT" },
  });

  const active = promos.find((p) => isPromoActiveNow(p));

  if (!active) {
    return NextResponse.json({ active: null });
  }

  return NextResponse.json({
    active: {
      id: active.id,
      name: active.name,
      type: active.type,
      value: active.value,
      label: promoLabel(active.type, active.value),
    },
  });
}

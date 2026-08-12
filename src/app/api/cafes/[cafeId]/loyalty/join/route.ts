import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getLoyaltyBalance,
  getLoyaltyProgramConfig,
  normalizePhone,
} from "@/lib/loyalty";

const schema = z.object({
  phone: z.string().min(9),
});

/** Public: telefon bilan sodiqlik dasturiga qo'shilish (QR va online app). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;

  try {
    const body = schema.parse(await request.json());
    const config = await getLoyaltyProgramConfig(cafeId);
    if (!config.enabled) {
      return NextResponse.json(
        { error: "Sodiqlik dasturi o'chirilgan" },
        { status: 400 },
      );
    }

    const phone = normalizePhone(body.phone);
    if (phone.length < 12) {
      return NextResponse.json(
        { error: "Telefon raqami noto'g'ri" },
        { status: 400 },
      );
    }

    await prisma.loyaltyCustomer.upsert({
      where: { cafeId_phone: { cafeId, phone } },
      create: {
        cafeId,
        phone,
        points: 0,
        cashbackBalanceTiyin: 0,
        totalSpent: 0,
        visitCount: 0,
      },
      update: {},
    });

    const balance = await getLoyaltyBalance(cafeId, phone);
    return NextResponse.json({ ok: true, ...balance });
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }
}

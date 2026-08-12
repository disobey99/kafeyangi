import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { getLoyaltyBalance } from "@/lib/loyalty";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const phone = new URL(request.url).searchParams.get("phone");

  if (phone) {
    const balance = await getLoyaltyBalance(cafeId, phone);
    return NextResponse.json(balance);
  }

  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const customers = await prisma.loyaltyCustomer.findMany({
    where: { cafeId },
    orderBy: { points: "desc" },
    take: 100,
  });

  return NextResponse.json({
    customers: customers.map((c) => ({
      id: c.id,
      phone: c.phone,
      points: c.points,
      cashbackSom: Math.floor(c.cashbackBalanceTiyin / 100),
      visitCount: c.visitCount,
      totalSpentSom: Math.floor(c.totalSpent / 100),
    })),
  });
}

const redeemSchema = z.object({
  phone: z.string().min(9),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  try {
    const body = redeemSchema.parse(await request.json());
    const balance = await getLoyaltyBalance(cafeId, body.phone);
    return NextResponse.json(balance);
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }
}

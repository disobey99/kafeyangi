import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  let code = await prisma.referralCode.findFirst({
    where: { cafeId, isActive: true },
  });
  if (!code) {
    code = await prisma.referralCode.create({
      data: {
        cafeId,
        code: `${randomCode()}${randomCode()}`.slice(0, 10),
      },
    });
  }

  const claims = await prisma.referralClaim.findMany({
    where: { OR: [{ senderCafeId: cafeId }, { receiverCafeId: cafeId }] },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ code: code.code, claims });
}

const applySchema = z.object({
  code: z.string().min(4),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const { code } = applySchema.parse(await request.json());
  const ref = await prisma.referralCode.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!ref || !ref.isActive) {
    return NextResponse.json({ error: "Referral kodi topilmadi" }, { status: 404 });
  }
  if (ref.cafeId === cafeId) {
    return NextResponse.json({ error: "O'zingizning kodni ishlata olmaysiz" }, { status: 400 });
  }

  const existing = await prisma.referralClaim.findFirst({
    where: { senderCafeId: ref.cafeId, receiverCafeId: cafeId },
  });
  if (existing) {
    return NextResponse.json({ error: "Bu referral allaqachon ishlatilgan" }, { status: 400 });
  }

  const claim = await prisma.referralClaim.create({
    data: {
      code: ref.code,
      senderCafeId: ref.cafeId,
      receiverCafeId: cafeId,
      rewardMonths: 1,
    },
  });

  return NextResponse.json({ ok: true, claim });
}

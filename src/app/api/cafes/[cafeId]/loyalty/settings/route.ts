import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCafeManager } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";
import { getLoyaltyProgramConfig } from "@/lib/loyalty";

const patchSchema = z.object({
  loyaltyEnabled: z.boolean().optional(),
  loyaltyTerms: z.string().nullable().optional(),
  loyaltyProgramType: z.enum(["CASHBACK", "PROMOTIONS"]).optional(),
  loyaltyRedeemPeriod: z.enum(["WEEK", "MONTH"]).optional(),
  loyaltyCashbackPercent: z.number().int().min(0).max(100).optional(),
  socialInstagram: z.string().url().nullable().optional().or(z.literal("")),
  socialTelegram: z.string().url().nullable().optional().or(z.literal("")),
  socialFacebook: z.string().url().nullable().optional().or(z.literal("")),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const program = await getLoyaltyProgramConfig(cafeId);

  return NextResponse.json({
    loyaltyEnabled: cafe.loyaltyEnabled,
    loyaltyTerms: cafe.loyaltyTerms ?? "",
    loyaltyProgramType: cafe.loyaltyProgramType,
    loyaltyRedeemPeriod: cafe.loyaltyRedeemPeriod,
    loyaltyCashbackPercent: cafe.loyaltyCashbackPercent,
    socialInstagram: cafe.socialInstagram ?? "",
    socialTelegram: cafe.socialTelegram ?? "",
    socialFacebook: cafe.socialFacebook ?? "",
    previewTerms: program.terms,
    redeemPeriodLabel: program.redeemPeriodLabel,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;

    const body = patchSchema.parse(await request.json());

    const cafe = await prisma.cafe.update({
      where: { id: cafeId },
      data: {
        ...(body.loyaltyEnabled !== undefined ? { loyaltyEnabled: body.loyaltyEnabled } : {}),
        ...(body.loyaltyTerms !== undefined
          ? { loyaltyTerms: body.loyaltyTerms?.trim() || null }
          : {}),
        ...(body.loyaltyProgramType !== undefined
          ? { loyaltyProgramType: body.loyaltyProgramType }
          : {}),
        ...(body.loyaltyRedeemPeriod !== undefined
          ? { loyaltyRedeemPeriod: body.loyaltyRedeemPeriod }
          : {}),
        ...(body.loyaltyCashbackPercent !== undefined
          ? { loyaltyCashbackPercent: body.loyaltyCashbackPercent }
          : {}),
        ...(body.socialInstagram !== undefined
          ? { socialInstagram: body.socialInstagram?.trim() || null }
          : {}),
        ...(body.socialTelegram !== undefined
          ? { socialTelegram: body.socialTelegram?.trim() || null }
          : {}),
        ...(body.socialFacebook !== undefined
          ? { socialFacebook: body.socialFacebook?.trim() || null }
          : {}),
      },
    });

    const program = await getLoyaltyProgramConfig(cafeId);

    return NextResponse.json({
      loyaltyEnabled: cafe.loyaltyEnabled,
      loyaltyTerms: cafe.loyaltyTerms ?? "",
      loyaltyProgramType: cafe.loyaltyProgramType,
      loyaltyRedeemPeriod: cafe.loyaltyRedeemPeriod,
      loyaltyCashbackPercent: cafe.loyaltyCashbackPercent,
      socialInstagram: cafe.socialInstagram ?? "",
      socialTelegram: cafe.socialTelegram ?? "",
      socialFacebook: cafe.socialFacebook ?? "",
      previewTerms: program.terms,
      redeemPeriodLabel: program.redeemPeriodLabel,
    });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { getCafePlanContext } from "@/lib/plan-access";
import { getPlanCurrency, getPlanPricing } from "@/lib/plan-pricing";
import { formatPlanPrice, getPlanConfig, PLANS } from "@/lib/plans";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const ctx = await getCafePlanContext(cafeId);
  if (!ctx) {
    return NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 });
  }

  const currency = getPlanCurrency();
  const plans = Object.values(PLANS).map((p) => {
    const pricing = getPlanPricing(p.id);
    return {
      id: p.id,
      name: p.name,
      priceLabel: formatPlanPrice(pricing.priceSom, currency),
      basePriceLabel: formatPlanPrice(pricing.basePriceSom, currency),
      priceSom: pricing.priceSom,
      basePriceSom: pricing.basePriceSom,
      discountPercent: pricing.discountPercent,
      discountActive: pricing.discountActive,
      discountValidTo: pricing.discountValidTo,
      description: p.description,
      maxTables: p.maxTables,
      maxStaff: p.maxStaff,
      maxProducts: p.maxProducts,
      features: p.features,
      current: p.id === ctx.cafe.plan,
    };
  });

  return NextResponse.json({
    plan: ctx.cafe.plan,
    planName: getPlanConfig(ctx.cafe.plan).name,
    status: ctx.cafe.status,
    trialEndsAt: ctx.cafe.trialEndsAt,
    subscriptionEndsAt: ctx.cafe.subscriptionEndsAt,
    subscriptionActive: ctx.subscription.active,
    subscriptionReason: ctx.subscription.reason,
    currency,
    usage: ctx.usage,
    limits: {
      maxTables: ctx.config.maxTables,
      maxStaff: ctx.config.maxStaff,
      maxProducts: ctx.config.maxProducts,
    },
    features: ctx.config.features,
    plans,
  });
}

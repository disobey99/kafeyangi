import { NextResponse } from "next/server";
import { getAllPlanPricing, getPlanCurrency } from "@/lib/plan-pricing";
import { getPlanConfig, PLAN_MARKETING_SECTIONS } from "@/lib/plans";

export async function GET() {
  const pricing = getAllPlanPricing();
  const currency = getPlanCurrency();
  const plans = pricing.map((p) => {
    const config = getPlanConfig(p.planId);
    return {
      id: p.planId,
      name: config.name,
      description: config.description,
      maxTables: config.maxTables,
      maxStaff: config.maxStaff,
      maxProducts: config.maxProducts,
      features: config.features,
      basePriceSom: p.basePriceSom,
      priceSom: p.priceSom,
      discountPercent: p.discountPercent,
      discountActive: p.discountActive,
      discountValidFrom: p.discountValidFrom,
      discountValidTo: p.discountValidTo,
    };
  });

  return NextResponse.json({ plans, currency, sections: PLAN_MARKETING_SECTIONS });
}

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PromoManager } from "@/components/promo-manager";
import { PlanUpgradeCard } from "@/components/plan-upgrade-card";
import { getCafePlanContext } from "@/lib/plan-access";

export default async function PromosPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) notFound();

  const planCtx = await getCafePlanContext(cafeId);
  if (!planCtx?.config.features.promos) {
    return (
      <PlanUpgradeCard
        feature="promos"
        currentPlan={planCtx?.config.name}
        cafeId={cafeId}
      />
    );
  }

  return <PromoManager cafeId={cafe.id} />;
}

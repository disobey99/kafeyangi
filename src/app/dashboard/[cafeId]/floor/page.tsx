import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { FloorPlan } from "@/components/floor-plan";
import { PlanUpgradeCard } from "@/components/plan-upgrade-card";
import { getCafePlanContext } from "@/lib/plan-access";

export default async function FloorPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) notFound();

  const planCtx = await getCafePlanContext(cafeId);
  if (!planCtx?.config.features.floorPlan) {
    return (
      <PlanUpgradeCard
        feature="floorPlan"
        currentPlan={planCtx?.config.name}
        cafeId={cafeId}
      />
    );
  }

  return <FloorPlan cafeId={cafe.id} />;
}

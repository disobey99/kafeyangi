import { OperationsHub } from "@/components/operations-hub";
import { PlanUpgradeCard } from "@/components/plan-upgrade-card";
import { requireCafeStaff } from "@/lib/cafe-access";
import { getCafePlanContext } from "@/lib/plan-access";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function OperationsPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId }, select: { id: true } });
  if (!cafe) notFound();
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) notFound();

  const planCtx = await getCafePlanContext(cafeId);
  if (!planCtx?.config.features.operationsHub) {
    return (
      <PlanUpgradeCard
        feature="operationsHub"
        currentPlan={planCtx?.config.name}
        cafeId={cafeId}
      />
    );
  }

  return <OperationsHub cafeId={cafeId} role={access.role} userId={access.session.userId} />;
}

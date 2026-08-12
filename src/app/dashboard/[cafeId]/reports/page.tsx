import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ReportsDashboard } from "@/components/reports-dashboard";
import { PlanUpgradeCard } from "@/components/plan-upgrade-card";
import { getCafePlanContext } from "@/lib/plan-access";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) notFound();

  const planCtx = await getCafePlanContext(cafeId);
  if (!planCtx?.config.features.reports) {
    return (
      <PlanUpgradeCard
        feature="reports"
        currentPlan={planCtx?.config.name}
        cafeId={cafeId}
      />
    );
  }

  return <ReportsDashboard cafeId={cafe.id} />;
}

import { BranchesManager } from "@/components/branches-manager";
import { PlanUpgradeCard } from "@/components/plan-upgrade-card";
import { getCafePlanContext } from "@/lib/plan-access";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function BranchesPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) notFound();

  const planCtx = await getCafePlanContext(cafeId);
  if (!planCtx?.config.features.multiBranch) {
    return (
      <PlanUpgradeCard
        feature="multiBranch"
        currentPlan={planCtx?.config.name}
        cafeId={cafeId}
      />
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--dp-text)]">Filiallar</h1>
      <p className="mt-1 text-stone-500">Ko&apos;p filial tarmoqni boshqarish</p>
      <div className="mt-8">
        <BranchesManager cafeId={cafeId} activeCafeId={cafeId} />
      </div>
    </div>
  );
}

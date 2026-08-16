import { notFound } from "next/navigation";
import { PlanUpgradeCard } from "@/components/plan-upgrade-card";
import { WarehouseHub } from "@/components/warehouse-hub";
import { getCafePlanContext } from "@/lib/plan-access";
import { CafeRole } from "@prisma/client";
import { requireCafeStaff } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";

type TabId =
  | "stock"
  | "movements"
  | "receipts"
  | "transfers"
  | "lots"
  | "counts"
  | "suppliers"
  | "alerts"
  | "reports";

export async function renderWarehousePage(cafeId: string, tab: TabId) {
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId }, select: { id: true } });
  if (!cafe) notFound();

  const access = await requireCafeStaff(cafeId, [
    CafeRole.OWNER,
    CafeRole.MANAGER,
    CafeRole.WAREHOUSE,
  ]);
  if (!access.ok) notFound();

  const planCtx = await getCafePlanContext(cafeId);
  if (!planCtx?.config.features.inventoryRation) {
    return (
      <PlanUpgradeCard
        feature="inventoryRation"
        currentPlan={planCtx?.config.name}
        cafeId={cafeId}
      />
    );
  }

  return <WarehouseHub cafeId={cafeId} initialTab={tab} />;
}


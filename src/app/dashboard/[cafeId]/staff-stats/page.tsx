import { StaffStatsDashboard } from "@/components/staff-stats-dashboard";
import { ShiftComparisonCard } from "@/components/shift-comparison-card";
import { PlanUpgradeCard } from "@/components/plan-upgrade-card";
import { getCafePlanContext } from "@/lib/plan-access";

export default async function StaffStatsPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const planCtx = await getCafePlanContext(cafeId);

  if (!planCtx?.config.features.staffEfficiency) {
    return (
      <PlanUpgradeCard
        feature="staffEfficiency"
        currentPlan={planCtx?.config.name}
        cafeId={cafeId}
      />
    );
  }

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--dp-accent)]">
          Xodimlar
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--dp-text)]">Xodimlar statistikasi</h1>
        <p className="mt-1 text-sm text-[var(--dp-muted)]">
          Buyurtmalar, savdo va chaqiruvga javob vaqti
        </p>
      </header>
      <StaffStatsDashboard cafeId={cafeId} />
      <div className="mt-8">
        <ShiftComparisonCard cafeId={cafeId} />
      </div>
    </div>
  );
}

import { requireDashboardAccess } from "@/lib/session-guard";
import { DashboardAccessGate } from "@/components/dashboard-access-gate";
import { getUserCafes } from "@/lib/branches";
import { enforceBillingGraceForCafe } from "@/lib/customer-cafe-gate";
import { getDashboardCafeAccessState } from "@/lib/dashboard-cafe-access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireDashboardAccess();
  const rawCafes = await getUserCafes(session.userId);

  for (const cafe of rawCafes) {
    await enforceBillingGraceForCafe(cafe.id);
  }

  const refreshedCafes = await getUserCafes(session.userId);
  const cafes = refreshedCafes.map(({ _count, ...cafe }) => ({
    id: cafe.id,
    name: cafe.name,
    slug: cafe.slug,
    dashboardTheme: cafe.dashboardTheme,
    productCount: _count.products,
    group: cafe.group,
    access: getDashboardCafeAccessState(cafe),
  }));
  const cafe = cafes[0];

  return (
    <DashboardAccessGate
      cafes={cafes}
      cafe={cafe}
      userId={session.userId}
      userName={session.name}
    >
      {children}
    </DashboardAccessGate>
  );
}

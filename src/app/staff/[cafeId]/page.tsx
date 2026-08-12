import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StaffNav } from "@/components/staff-nav";
import { WaiterPanel } from "@/components/waiter-panel";
import { StaffShell } from "@/components/staff-shell";
import { StaffPinLayout } from "@/components/staff-pin-layout";
import { requireWaiterPage } from "@/lib/session-guard";

export default async function WaiterPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) notFound();

  const { session, role } = await requireWaiterPage(cafeId);
  const waiterOnly = role === "WAITER";

  return (
    <StaffShell variant="waiter">
      <StaffPinLayout
        cafeId={cafe.id}
        walkieUser={{
          userId: session.userId,
          userName: session.name,
          userRole: role,
        }}
      >
        {!waiterOnly && (
          <StaffNav
            cafeId={cafe.id}
            cafeName={cafe.name}
            active="staff"
            userName={session.name}
            userId={session.userId}
            userRole={role}
            waiterOnly={waiterOnly}
          />
        )}
        <WaiterPanel
          cafeId={cafe.id}
          cafeName={cafe.name}
          userName={session.name}
          userId={session.userId}
          userRole={role}
          waiterServiceFeePercent={cafe.waiterServiceFeePercent}
          waiterOnly={waiterOnly}
        />
      </StaffPinLayout>
    </StaffShell>
  );
}

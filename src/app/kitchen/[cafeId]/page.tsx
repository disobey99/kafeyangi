import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StaffNav } from "@/components/staff-nav";
import { KitchenPanel } from "@/components/kitchen-panel";
import { StaffShell } from "@/components/staff-shell";
import { StaffPinLayout } from "@/components/staff-pin-layout";
import { requireKitchenPage } from "@/lib/session-guard";

export default async function KitchenPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) notFound();

  const { session, role } = await requireKitchenPage(cafeId);
  const kitchenOnly = role === "KITCHEN";

  return (
    <StaffShell>
      <StaffPinLayout
        cafeId={cafe.id}
        walkieUser={{
          userId: session.userId,
          userName: session.name,
          userRole: role,
        }}
      >
        <StaffNav
          cafeId={cafe.id}
          cafeName={cafe.name}
          active="kitchen"
          userName={session.name}
          userId={session.userId}
          userRole={role}
          kitchenOnly={kitchenOnly}
        />
        <KitchenPanel cafeId={cafe.id} cafeName={cafe.name} userId={session.userId} />
      </StaffPinLayout>
    </StaffShell>
  );
}

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CashierPanel } from "@/components/cashier-panel";
import { StaffNav } from "@/components/staff-nav";
import { StaffShell } from "@/components/staff-shell";
import { StaffPinLayout } from "@/components/staff-pin-layout";
import { requireCashierPage } from "@/lib/session-guard";

export default async function CashierPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) notFound();

  const { session, role } = await requireCashierPage(cafeId);
  const cashierOnly = role === "CASHIER";

  const productCount = await prisma.product.count({ where: { cafeId: cafe.id } });

  return (
    <StaffShell variant="cashier">
      <StaffPinLayout
        cafeId={cafe.id}
        walkieUser={{
          userId: session.userId,
          userName: session.name,
          userRole: role,
        }}
      >
        <div className="cashier-pos-layout">
          <StaffNav
            cafeId={cafe.id}
            cafeName={cafe.name}
            active="cashier"
            userName={session.name}
            userId={session.userId}
            userRole={role}
            cashierOnly={cashierOnly}
            productCount={productCount}
          />
          <main className="min-w-0 flex-1">
            <CashierPanel
              cafeId={cafe.id}
              cafeName={cafe.name}
              productCount={productCount}
              cashierOnly={cashierOnly}
            />
          </main>
        </div>
      </StaffPinLayout>
    </StaffShell>
  );
}

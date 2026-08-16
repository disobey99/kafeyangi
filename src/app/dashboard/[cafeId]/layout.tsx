import { redirect } from "next/navigation";
import { CafeRole } from "@prisma/client";
import { getSession, isSuperAdmin } from "@/lib/auth";
import { getCafeMembership } from "@/lib/cafe-access";
import { isWarehouseOnlyViewer } from "@/lib/dashboard-viewer";
import { WarehouseAclGuard } from "@/components/warehouse-acl-guard";

export default async function CafeDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  let warehouseOnly = false;
  if (!isSuperAdmin(session)) {
    warehouseOnly = await isWarehouseOnlyViewer(session.userId);
    if (warehouseOnly) {
      const membership = await getCafeMembership(session.userId, cafeId);
      if (!membership || membership.role !== CafeRole.WAREHOUSE) {
        redirect("/dashboard");
      }
    }
  }

  return (
    <>
      {warehouseOnly ? <WarehouseAclGuard cafeId={cafeId} /> : null}
      {children}
    </>
  );
}

import { CafeRole, GlobalRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const STAFF_PANEL: Partial<Record<CafeRole, string>> = {
  [CafeRole.WAITER]: "staff",
  [CafeRole.CASHIER]: "cashier",
  [CafeRole.KITCHEN]: "kitchen",
};

function warehouseHome(cafeId: string) {
  return `/dashboard/${cafeId}/warehouse`;
}

export async function getLoginRedirect(
  userId: string,
  globalRole: GlobalRole
): Promise<string> {
  if (globalRole === GlobalRole.SUPER_ADMIN) return "/platform";
  if (globalRole === ("PLATFORM_STAFF" as GlobalRole)) return "/platform";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ownedCafes: {
        where: { status: { not: "CANCELLED" } },
        select: { id: true },
        take: 1,
      },
      memberships: {
        where: { isActive: true },
        include: { cafe: { select: { id: true, slug: true, status: true } } },
      },
    },
  });

  if (!user) return "/login";
  if (user.ownedCafes.length > 0) return "/dashboard";

  const memberships = user.memberships.filter((m) => m.cafe.status !== "CANCELLED");
  if (memberships.length === 0) return "/login";

  const roles = new Set(memberships.map((m) => m.role));
  const isManager = roles.has(CafeRole.MANAGER);
  if (isManager) return "/dashboard";

  // Oddiy xodim — faqat o'z rolidagi oyna (admin paneliga yo'l yo'q)
  if (roles.size === 1) {
    const m = memberships[0];
    if (m.role === CafeRole.COURIER) {
      return `/c/${m.cafe.slug}/app`;
    }
    if (m.role === CafeRole.WAREHOUSE) {
      return warehouseHome(m.cafe.id);
    }
    const panel = STAFF_PANEL[m.role];
    if (panel) return `/${panel}/${m.cafe.id}`;
  }

  const staffPriority = [
    CafeRole.WAREHOUSE,
    CafeRole.CASHIER,
    CafeRole.WAITER,
    CafeRole.KITCHEN,
    CafeRole.COURIER,
  ] as const;
  for (const role of staffPriority) {
    const m = memberships.find((x) => x.role === role);
    if (!m) continue;
    if (role === CafeRole.COURIER) return `/c/${m.cafe.slug}/app`;
    if (role === CafeRole.WAREHOUSE) return warehouseHome(m.cafe.id);
    if (STAFF_PANEL[role]) return `/${STAFF_PANEL[role]}/${m.cafe.id}`;
  }

  return "/login";
}

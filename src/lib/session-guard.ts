import { redirect } from "next/navigation";
import { CafeRole, GlobalRole } from "@prisma/client";
import { getSession, isPlatformAccess, isSuperAdmin } from "@/lib/auth";
import { getCafeMembership } from "@/lib/cafe-access";
import { getLoginRedirect } from "@/lib/staff-redirect";

export async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isSuperAdmin(session)) redirect("/dashboard");
  return session;
}

export async function requirePlatformAccess() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isPlatformAccess(session)) redirect("/dashboard");
  if (!isSuperAdmin(session) && (session.globalRole as string) === "PLATFORM_STAFF") {
    const { getPlatformAccessPermissions } = await import(
      "@/lib/platform-permissions-server"
    );
    const perms = await getPlatformAccessPermissions(session);
    if (perms !== "ALL" && perms.length === 0) redirect("/login?error=inactive");
  }
  return session;
}

/** Sahifa: kerakli menyu ruxsati bo'lmasa birinchi ruxsatli menyuga yo'naltiradi */
export async function requirePlatformMenu(
  permission: import("@/lib/platform-permissions").PlatformPermission,
) {
  const session = await requirePlatformAccess();
  const { hasPlatformPermission } = await import("@/lib/platform-permissions");
  const { getPlatformAccessPermissions } = await import(
    "@/lib/platform-permissions-server"
  );
  const perms = await getPlatformAccessPermissions(session);
  if (!hasPlatformPermission(perms, permission)) {
    const map: Record<string, string> = {
      "menu.dashboard": "/platform",
      "menu.cafes": "/platform/cafes",
      "menu.insights": "/platform/insights",
      "menu.payments": "/platform/payments",
      "menu.map": "/platform/map",
      "menu.reports": "/platform/reports",
      "menu.support": "/platform/support",
      "menu.settings": "/platform/settings",
    };
    const fallback =
      perms === "ALL"
        ? "menu.dashboard"
        : (perms.find((p) => p.startsWith("menu.")) ?? "menu.dashboard");
    redirect(map[fallback] ?? "/platform");
  }
  return session;
}

/** API: ruxsat yo'q bo'lsa 403 */
export async function requirePlatformApiPermission(
  permission: import("@/lib/platform-permissions").PlatformPermission,
) {
  const { NextResponse } = await import("next/server");
  const session = await getSession();
  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Kirish kerak" }, { status: 401 }),
    };
  }
  if (!isPlatformAccess(session)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 }),
    };
  }
  const { hasPlatformPermission } = await import("@/lib/platform-permissions");
  const { getPlatformAccessPermissions } = await import(
    "@/lib/platform-permissions-server"
  );
  const perms = await getPlatformAccessPermissions(session);
  if (!hasPlatformPermission(perms, permission)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Bu amalga ruxsat yo'q" }, { status: 403 }),
    };
  }
  return { ok: true as const, session, perms };
}

export async function requireAuth(nextPath?: string) {
  const session = await getSession();
  if (!session) {
    const loginUrl = nextPath
      ? `/login?next=${encodeURIComponent(nextPath)}`
      : "/login";
    redirect(loginUrl);
  }
  return session;
}

async function redirectStaffHome(session: { userId: string; globalRole: GlobalRole }) {
  redirect(await getLoginRedirect(session.userId, session.globalRole));
}

/** Faqat admin (egasi / nazoratchi). Kassir, ofitsiant, oshxona — kira olmaydi. */
export async function requireDashboardAccess(): Promise<
  NonNullable<Awaited<ReturnType<typeof getSession>>>
> {
  const session = await requireAuth("/dashboard");
  if (isSuperAdmin(session)) return session;
  if ((session.globalRole as string) === "PLATFORM_STAFF") redirect("/platform");

  const { prisma } = await import("@/lib/prisma");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      ownedCafes: {
        where: { status: { not: "CANCELLED" } },
        select: { id: true },
        take: 1,
      },
      memberships: {
        where: { isActive: true, cafe: { status: { not: "CANCELLED" } } },
        select: { role: true, cafeId: true },
      },
    },
  });

  if (user?.ownedCafes.length) return session;

  const isManager = user?.memberships.some((m) => m.role === CafeRole.MANAGER);
  if (isManager) return session;

  // Xodim (kassir / ofitsiant / oshxona) — faqat o'z oynasiga
  await redirectStaffHome(session);
  throw new Error("Unreachable: staff redirect should have happened");
}

const WAITER_PAGE_ROLES: CafeRole[] = [
  CafeRole.OWNER,
  CafeRole.MANAGER,
  CafeRole.WAITER,
];

const CASHIER_PAGE_ROLES: CafeRole[] = [
  CafeRole.OWNER,
  CafeRole.MANAGER,
  CafeRole.CASHIER,
];

const KITCHEN_PAGE_ROLES: CafeRole[] = [
  CafeRole.OWNER,
  CafeRole.MANAGER,
  CafeRole.KITCHEN,
];

/** TV ekran — faqat admin ochadi (xodimlar URL orqali kira olmaydi) */
const DISPLAY_PAGE_ROLES: CafeRole[] = [CafeRole.OWNER, CafeRole.MANAGER];

async function redirectByRole(
  cafeId: string,
  role: CafeRole,
  session?: { userId: string; globalRole: GlobalRole },
) {
  if (role === CafeRole.CASHIER) redirect(`/cashier/${cafeId}`);
  if (role === CafeRole.WAITER) redirect(`/staff/${cafeId}`);
  if (role === CafeRole.KITCHEN) redirect(`/kitchen/${cafeId}`);
  if (role === CafeRole.COURIER) {
    if (session) {
      await redirectStaffHome(session);
    }
    const { prisma } = await import("@/lib/prisma");
    const cafe = await prisma.cafe.findUnique({
      where: { id: cafeId },
      select: { slug: true },
    });
    if (cafe?.slug) redirect(`/c/${cafe.slug}/app`);
    redirect("/login");
  }
  redirect("/dashboard");
}

export async function requireWaiterPage(cafeId: string) {
  const session = await requireAuth(`/staff/${cafeId}`);
  if (isSuperAdmin(session)) {
    return { session, role: CafeRole.OWNER as CafeRole };
  }

  const membership = await getCafeMembership(session.userId, cafeId);
  if (!membership) {
    await redirectStaffHome(session);
    throw new Error("Unreachable: staff redirect should have happened");
  }

  if (!WAITER_PAGE_ROLES.includes(membership.role)) {
    await redirectByRole(cafeId, membership.role, session);
  }

  return { session, role: membership.role };
}

export async function requireCashierPage(cafeId: string) {
  const session = await requireAuth(`/cashier/${cafeId}`);
  if (isSuperAdmin(session)) {
    return { session, role: CafeRole.OWNER as CafeRole };
  }

  const membership = await getCafeMembership(session.userId, cafeId);
  if (!membership) {
    await redirectStaffHome(session);
    throw new Error("Unreachable: staff redirect should have happened");
  }

  if (!CASHIER_PAGE_ROLES.includes(membership.role)) {
    await redirectByRole(cafeId, membership.role, session);
  }

  return { session, role: membership.role };
}

export async function requireKitchenPage(cafeId: string) {
  const session = await requireAuth(`/kitchen/${cafeId}`);
  if (isSuperAdmin(session)) {
    return { session, role: CafeRole.OWNER as CafeRole };
  }

  const membership = await getCafeMembership(session.userId, cafeId);
  if (!membership) {
    await redirectStaffHome(session);
    throw new Error("Unreachable: staff redirect should have happened");
  }

  if (!KITCHEN_PAGE_ROLES.includes(membership.role)) {
    await redirectByRole(cafeId, membership.role, session);
  }

  return { session, role: membership.role };
}

export async function requireDisplayPage(cafeId: string) {
  const session = await requireAuth(`/display/${cafeId}`);
  if (isSuperAdmin(session)) {
    return { session, role: CafeRole.OWNER as CafeRole };
  }

  const membership = await getCafeMembership(session.userId, cafeId);
  if (!membership) {
    await redirectStaffHome(session);
    throw new Error("Unreachable: staff redirect should have happened");
  }

  if (!DISPLAY_PAGE_ROLES.includes(membership.role)) {
    await redirectByRole(cafeId, membership.role, session);
  }

  return { session, role: membership.role };
}

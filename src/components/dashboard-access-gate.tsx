"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  DashboardCafeBlockedScreen,
  DashboardSubscriptionOnlyShell,
} from "@/components/dashboard-cafe-blocked-screen";
import type { DashboardCafeAccessState } from "@/lib/dashboard-cafe-access";
import type { DashboardThemeId } from "@/lib/dashboard-themes";

export type DashboardCafeOption = {
  id: string;
  name: string;
  slug: string;
  dashboardTheme?: DashboardThemeId;
  productCount?: number;
  group?: { name: string } | null;
  access: DashboardCafeAccessState;
};

export function DashboardAccessGate({
  cafes,
  cafe,
  userId,
  userName,
  children,
}: {
  cafes: DashboardCafeOption[];
  cafe: DashboardCafeOption | undefined;
  userId: string;
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const activeCafe = useMemo(() => {
    const match = pathname.match(/^\/dashboard\/([^/]+)/);
    const idFromPath = match?.[1];
    if (idFromPath) {
      return cafes.find((c) => c.id === idFromPath) ?? cafe ?? cafes[0];
    }
    return cafe ?? cafes[0];
  }, [pathname, cafes, cafe]);

  const access = activeCafe?.access;

  if (access?.blocked) {
    const isSubscriptionPage =
      activeCafe &&
      (pathname === `/dashboard/${activeCafe.id}/subscription` ||
        pathname.startsWith(`/dashboard/${activeCafe.id}/subscription/`));

    if (access.variant === "billing" && isSubscriptionPage) {
      return (
        <DashboardSubscriptionOnlyShell
          cafeName={activeCafe.name}
          userName={userName}
        >
          {children}
        </DashboardSubscriptionOnlyShell>
      );
    }

    return (
      <DashboardCafeBlockedScreen
        cafeId={activeCafe.id}
        cafeName={activeCafe.name}
        variant={access.variant}
        suspendReason={access.suspendReason}
        support={access.support}
        userName={userName}
      />
    );
  }

  return (
    <DashboardShell cafes={cafes} cafe={cafe} userId={userId} userName={userName}>
      {children}
    </DashboardShell>
  );
}

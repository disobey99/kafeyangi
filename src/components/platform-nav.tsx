"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Map,
  MessageCircle,
  Settings,
  Store,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { usePlatformRealtime } from "@/hooks/use-platform-realtime";
import {
  navAllowedForPermissions,
  type PlatformAccessPerms,
  type PlatformPermission,
} from "@/lib/platform-permissions";

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "support";
}> = [
  { href: "/platform", label: "Bosh sahifa", icon: LayoutDashboard },
  { href: "/platform/cafes", label: "Mijozlar", icon: Store },
  { href: "/platform/insights", label: "Mijozlar tahlili", icon: TrendingUp },
  { href: "/platform/payments", label: "To'lovlar va obunalar", icon: CreditCard },
  { href: "/platform/map", label: "Xarita", icon: Map },
  { href: "/platform/reports", label: "Hisobotlar", icon: BarChart3 },
  { href: "/platform/staff", label: "Xodimlar", icon: Users },
  { href: "/platform/support", label: "Qo'llab-quvvatlash", icon: MessageCircle, badge: "support" },
  { href: "/platform/settings", label: "Sozlamalar", icon: Settings },
];

export function PlatformNav({
  permissions = "ALL",
  onNavigate,
}: {
  permissions?: PlatformAccessPerms;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [supportUnread, setSupportUnread] = useState(0);

  const items = useMemo(
    () => NAV_ITEMS.filter((item) => navAllowedForPermissions(item.href, permissions)),
    [permissions],
  );

  const canSupport = useMemo(() => {
    if (permissions === "ALL") return true;
    return (permissions as PlatformPermission[]).includes("menu.support");
  }, [permissions]);

  const loadUnread = useCallback(async () => {
    if (!canSupport) return;
    try {
      const res = await fetch("/api/platform/support/unread");
      if (!res.ok) return;
      const data = await res.json();
      setSupportUnread(Number(data.unread ?? 0));
    } catch {
      /* ignore */
    }
  }, [canSupport]);

  useEffect(() => {
    void loadUnread();
    if (!canSupport) return;
    const timer = setInterval(() => void loadUnread(), 30_000);
    return () => clearInterval(timer);
  }, [loadUnread, canSupport]);

  usePlatformRealtime(
    (event) => {
      if (event.type === "support.message") void loadUnread();
    },
    { enabled: canSupport },
  );

  return (
    <nav className="flex-1 space-y-1 p-4">
      {items.map((item) => {
        const active =
          item.href === "/platform"
            ? pathname === "/platform"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        const badgeCount = item.badge === "support" ? supportUnread : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => onNavigate?.()}
            className={`platform-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active ? "is-active" : ""
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {badgeCount > 0 && (
              <span className="platform-nav-badge flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

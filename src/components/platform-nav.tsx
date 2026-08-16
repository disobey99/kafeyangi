"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Map,
  MessageCircle,
  Package,
  Percent,
  Settings,
  ShoppingBag,
  Store,
  Tags,
  TrendingUp,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { usePlatformRealtime } from "@/hooks/use-platform-realtime";
import {
  navAllowedForPermissions,
  type PlatformAccessPerms,
  type PlatformPermission,
} from "@/lib/platform-permissions";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "support" | "shopOrders";
};

type NavSection = {
  title: string | null;
  /** Collapsible section (arrow) */
  collapsible?: boolean;
  items: NavItem[];
};

const SHOPPING_OPEN_KEY = "platform:nav:shopping-open";

const NAV_SECTIONS: NavSection[] = [
  {
    title: null,
    items: [
      { href: "/platform", label: "Bosh sahifa", icon: LayoutDashboard },
      { href: "/platform/cafes", label: "Mijozlar", icon: Store },
      { href: "/platform/insights", label: "Mijozlar tahlili", icon: TrendingUp },
      { href: "/platform/payments", label: "To'lovlar va obunalar", icon: CreditCard },
      { href: "/platform/map", label: "Xarita", icon: Map },
      { href: "/platform/reports", label: "Hisobotlar", icon: BarChart3 },
      { href: "/platform/staff", label: "Xodimlar", icon: Users },
      {
        href: "/platform/support",
        label: "Qo'llab-quvvatlash",
        icon: MessageCircle,
        badge: "support",
      },
    ],
  },
  {
    title: "Shopping",
    collapsible: true,
    items: [
      { href: "/platform/shopping", label: "Umumiy", icon: ShoppingBag },
      {
        href: "/platform/shopping/orders",
        label: "Buyurtmalar",
        icon: ClipboardList,
        badge: "shopOrders",
      },
      { href: "/platform/shopping/stock", label: "Ombor", icon: Warehouse },
      { href: "/platform/shopping/products", label: "Mahsulotlar", icon: Package },
      { href: "/platform/shopping/categories", label: "Kategoriyalar", icon: Tags },
      { href: "/platform/shopping/discounts", label: "Chegirmalar", icon: Percent },
    ],
  },
  {
    title: null,
    items: [{ href: "/platform/settings", label: "Sozlamalar", icon: Settings }],
  },
];

function itemIsActive(pathname: string, href: string) {
  if (href === "/platform") return pathname === "/platform";
  if (href === "/platform/shopping") return pathname === "/platform/shopping";
  return pathname.startsWith(href);
}

function CollapsibleSection({
  title,
  items,
  pathname,
  supportUnread,
  shopNewOrders,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  supportUnread: number;
  shopNewOrders: number;
  onNavigate?: () => void;
}) {
  const childActive = items.some((item) => itemIsActive(pathname, item.href));
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SHOPPING_OPEN_KEY);
      if (saved === "0" && !childActive) setOpen(false);
      else if (saved === "1") setOpen(true);
    } catch {
      /* ignore */
    }
  }, [childActive]);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SHOPPING_OPEN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-stone-100 dark:hover:bg-white/5"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300">
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-300 group-hover:text-stone-600 ${
            open ? "rotate-180" : "rotate-0"
          }`}
          strokeWidth={2}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-1 pb-0.5">
            {items.map((item) => {
              const active = itemIsActive(pathname, item.href);
              const Icon = item.icon;
              const badgeCount =
                item.badge === "support"
                  ? supportUnread
                  : item.badge === "shopOrders"
                    ? shopNewOrders
                    : 0;
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
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlatformNav({
  permissions = "ALL",
  onNavigate,
}: {
  permissions?: PlatformAccessPerms;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [supportUnread, setSupportUnread] = useState(0);
  const [shopNewOrders, setShopNewOrders] = useState(0);

  const sections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          navAllowedForPermissions(item.href, permissions),
        ),
      })).filter((section) => section.items.length > 0),
    [permissions],
  );

  const canSupport = useMemo(() => {
    if (permissions === "ALL") return true;
    return (permissions as PlatformPermission[]).includes("menu.support");
  }, [permissions]);

  const canShopping = useMemo(() => {
    if (permissions === "ALL") return true;
    return (permissions as PlatformPermission[]).includes("menu.shopping");
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

  const loadShopOrders = useCallback(async () => {
    if (!canShopping) return;
    try {
      const res = await fetch("/api/platform/shopping/orders/new-count");
      if (!res.ok) return;
      const data = await res.json();
      setShopNewOrders(Number(data.newCount ?? 0));
    } catch {
      /* ignore */
    }
  }, [canShopping]);

  useEffect(() => {
    void loadUnread();
    void loadShopOrders();
    const timer = setInterval(() => {
      void loadUnread();
      void loadShopOrders();
    }, 30_000);
    return () => clearInterval(timer);
  }, [loadUnread, loadShopOrders]);

  usePlatformRealtime(
    (event) => {
      if (event.type === "support.message") void loadUnread();
    },
    { enabled: canSupport },
  );

  return (
    <nav className="h-full space-y-4 overflow-y-auto overscroll-contain p-4">
      {sections.map((section, si) => {
        if (section.collapsible && section.title) {
          return (
            <CollapsibleSection
              key={section.title}
              title={section.title}
              items={section.items}
              pathname={pathname}
              supportUnread={supportUnread}
              shopNewOrders={shopNewOrders}
              onNavigate={onNavigate}
            />
          );
        }

        return (
          <div key={section.title ?? `sec-${si}`} className="space-y-1">
            {section.title && (
              <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const active = itemIsActive(pathname, item.href);
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
          </div>
        );
      })}
    </nav>
  );
}

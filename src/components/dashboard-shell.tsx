"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  Bell,
  Building2,
  ChefHat,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Gift,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  Menu,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  Settings,
  ShoppingBag,
  Smartphone,
  Truck,
  UserCheck,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { CafeOrderNotifier } from "@/components/cafe-order-notifier";
import { CafeSwitcher } from "@/components/cafe-switcher";
import { DashboardAppearanceMenu } from "@/components/dashboard-appearance-menu";
import { DashboardPlanUpgradeCard } from "@/components/dashboard-plan-upgrade-card";
import { PlanUpsellPopup } from "@/components/plan-upsell-popup";
import { AppNotificationsBell } from "@/components/app-notifications-bell";
import { NooklineMark } from "@/components/nookline-mark";
import { StaffChatWidget } from "@/components/staff-chat-widget";
import { ThemeToggle } from "@/components/theme-toggle";
import { SessionWatchdog } from "@/components/session-watchdog";
import { dashboardThemeClass } from "@/lib/dashboard-themes";
import type { DashboardThemeId } from "@/lib/dashboard-themes";
import type { PlanFeatures } from "@/lib/plans";
import { useHardwareBackGuard } from "@/hooks/use-hardware-back";

type CafeOption = {
  id: string;
  name: string;
  slug: string;
  dashboardTheme?: DashboardThemeId;
  productCount?: number;
  group?: { name: string } | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  menuWarning?: boolean;
  orderBadge?: boolean;
  /** Tarif bo'yicha soft-lock */
  feature?: keyof PlanFeatures;
  /** Sidebarda boshqa tugmalardan ajralib turadigan accent */
  accent?: "shopping";
};

const mainNav = (cafeId: string): NavItem[] => [
  { href: "/dashboard", label: "Bosh sahifa", icon: LayoutDashboard, exact: true },
  { href: `/dashboard/${cafeId}/menu`, label: "Menyu", icon: UtensilsCrossed },
  {
    href: `/dashboard/${cafeId}/online-store`,
    label: "Onlayn do'kon",
    icon: ShoppingBag,
    accent: "shopping",
  },
  {
    href: `/dashboard/${cafeId}/warehouse`,
    label: "Ombor",
    icon: Package,
    feature: "inventoryRation",
  },
  { href: `/dashboard/${cafeId}/tables`, label: "Stollar", icon: LayoutGrid },
  { href: `/dashboard/${cafeId}/orders`, label: "Buyurtmalar", icon: ClipboardList },
  {
    href: `/dashboard/${cafeId}/courier-monitor`,
    label: "Kuryer nazorati",
    icon: Truck,
  },
  {
    href: `/dashboard/${cafeId}/reports`,
    label: "Hisobotlar",
    icon: BarChart3,
    feature: "reports",
  },
  {
    href: `/dashboard/${cafeId}/floor`,
    label: "Zal sxemasi",
    icon: Monitor,
    feature: "floorPlan",
  },
  {
    href: `/dashboard/${cafeId}/promos`,
    label: "Chegirmalar",
    icon: Package,
    feature: "promos",
  },
];

const settingsNav = (cafeId: string): NavItem[] => [
  { href: `/dashboard/${cafeId}/settings`, label: "Sozlamalar", icon: Settings },
  { href: `/dashboard/${cafeId}/app-settings`, label: "Ilova sozlamalari", icon: Smartphone },
  {
    href: `/dashboard/${cafeId}/staff-stats`,
    label: "Xodim stat.",
    icon: UserCheck,
    feature: "staffEfficiency",
  },
  { href: `/dashboard/${cafeId}/loyalty`, label: "Sodiqlik", icon: Gift },
  { href: `/dashboard/${cafeId}/subscription`, label: "Obuna", icon: CreditCard },
  {
    href: `/dashboard/${cafeId}/operations`,
    label: "Operations Hub",
    icon: Menu,
    feature: "operationsHub",
  },
  {
    href: `/dashboard/${cafeId}/branches`,
    label: "Filiallar",
    icon: Building2,
    feature: "multiBranch",
  },
  { href: `/dashboard/${cafeId}/staff`, label: "Xodimlar", icon: Users },
];

const staffNav = (cafeId: string): NavItem[] => [
  { href: `/cashier/${cafeId}`, label: "Kassa", icon: Wallet, menuWarning: true, orderBadge: true },
  { href: `/kitchen/${cafeId}`, label: "Oshxona", icon: ChefHat },
  { href: `/staff/${cafeId}`, label: "Ofitsiant", icon: Bell },
  { href: `/display/${cafeId}`, label: "TV ekran", icon: Monitor },
];

const SIDEBAR_COLLAPSED_KEY = "kafe:sidebar-collapsed";
const SIDEBAR_WIDTH_EXPANDED = 272;
const SIDEBAR_WIDTH_COLLAPSED = 88;

function railNavItems(cafeId: string): NavItem[] {
  return [
    mainNav(cafeId)[0],
    mainNav(cafeId)[1],
    mainNav(cafeId)[2],
    mainNav(cafeId)[3],
    mainNav(cafeId)[4],
    settingsNav(cafeId)[0],
    staffNav(cafeId)[0],
  ];
}

function SidebarEdgeHandle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="dp-sidebar-edge-handle hidden lg:flex"
      aria-label={collapsed ? "Menyuni ochish" : "Menyuni yig'ish"}
      title={collapsed ? "Menyuni ochish" : "Menyuni yig'ish"}
    >
      {collapsed ? (
        <PanelLeftOpen className="h-4 w-4" strokeWidth={2.25} />
      ) : (
        <PanelLeftClose className="h-4 w-4" strokeWidth={2.25} />
      )}
    </button>
  );
}

function RailNavLink({
  item,
  active,
  showOrderBadge,
  showMenuWarning,
  pendingOrders,
}: {
  item: NavItem;
  active: boolean;
  showOrderBadge: boolean;
  showMenuWarning: boolean;
  pendingOrders: number;
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.querySelector<HTMLElement>(".dashboard-panel"));
  }, []);

  const Icon = item.icon;

  function updateTooltip() {
    const el = linkRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltip({
      x: rect.right + 12,
      y: rect.top + rect.height / 2,
    });
  }

  function hideTooltip() {
    setTooltip(null);
  }

  return (
    <>
      <Link
        ref={linkRef}
        href={item.href}
        className={`dp-rail-link${active ? " dp-rail-link-active" : ""}`}
        onMouseEnter={updateTooltip}
        onFocus={updateTooltip}
        onMouseLeave={hideTooltip}
        onBlur={hideTooltip}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.25 : 1.85} />
        {showOrderBadge && (
          <span className="dp-rail-badge">{pendingOrders > 9 ? "9+" : pendingOrders}</span>
        )}
        {showMenuWarning && !showOrderBadge && (
          <span className="dp-rail-badge dp-rail-badge-warn">!</span>
        )}
      </Link>
      {portalRoot &&
        tooltip &&
        createPortal(
          <span
            className="dp-rail-tooltip-portal"
            style={{ left: tooltip.x, top: tooltip.y }}
            role="tooltip"
          >
            {item.label}
          </span>,
          portalRoot,
        )}
    </>
  );
}

function SidebarRail({
  cafe,
  userId,
  userName,
  productCount,
  pendingOrders,
  isActive,
  onThemeChange,
}: {
  cafe: CafeOption;
  userId: string;
  userName: string;
  productCount: number;
  pendingOrders: number;
  isActive: (item: NavItem) => boolean;
  onThemeChange?: (theme: DashboardThemeId) => void;
}) {
  const items = railNavItems(cafe.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="dp-sidebar-brand-rail">
        <Link href="/dashboard" className="dp-sidebar-brand-rail-link">
          <span className="dp-sidebar-brand-mark">
            <NooklineMark size={44} className="!h-full !w-full" />
          </span>
          <p className="dp-sidebar-brand-name">{cafe.name}</p>
        </Link>
      </div>

      <nav className="dp-sidebar-rail-nav" aria-label="Tez navigatsiya">
        {items.map((item) => {
          const active = isActive(item);
          const showOrderBadge = item.orderBadge && pendingOrders > 0;
          const showMenuWarning = item.menuWarning && productCount === 0;

          return (
            <RailNavLink
              key={item.href}
              item={item}
              active={active}
              showOrderBadge={!!showOrderBadge}
              showMenuWarning={!!showMenuWarning}
              pendingOrders={pendingOrders}
            />
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 px-2 pb-3">
        <DashboardPlanUpgradeCard cafeId={cafe.id} compact />
        <div className="flex flex-col items-center gap-2">
          <DashboardAppearanceMenu cafeId={cafe.id} compact onThemeChange={onThemeChange} />
          <StaffChatWidget
            cafeId={cafe.id}
            userId={userId}
            userName={userName}
            variant="icon"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--dp-sidebar-border)] bg-[var(--dp-nav-hover)] text-[var(--dp-sidebar-fg)] transition hover:opacity-90"
          />
        </div>
      </div>
    </div>
  );
}

function SidebarBrand({ cafe }: { cafe: CafeOption | undefined }) {
  return (
    <div className="dp-sidebar-brand-expanded">
      <Link href="/dashboard" className="dp-sidebar-brand-expanded-link">
        <span className="dp-sidebar-brand-mark">
          <NooklineMark size={44} className="!h-full !w-full" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tracking-tight text-[var(--dp-sidebar-fg)]">
            {cafe?.name ?? "Kafe paneli"}
          </p>
          <p className="truncate text-xs text-[var(--dp-sidebar-muted)]">Boshqaruv paneli</p>
        </div>
      </Link>
    </div>
  );
}

function SidebarNav({
  cafe,
  productCount,
  pendingOrders,
  isActive,
  onNavigate,
  lockedFeatures,
  warehouseOnly = false,
}: {
  cafe: CafeOption;
  productCount: number;
  pendingOrders: number;
  isActive: (item: NavItem) => boolean;
  onNavigate?: () => void;
  lockedFeatures: Partial<Record<keyof PlanFeatures, boolean>>;
  warehouseOnly?: boolean;
}) {
  if (warehouseOnly) {
    const items = mainNav(cafe.id).filter((i) =>
      i.href.includes("/warehouse"),
    );
    return (
      <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        <NavSection
          title="Ombor"
          items={items}
          isActive={isActive}
          onNavigate={onNavigate}
          defaultOpen
          productCount={productCount}
          pendingOrders={pendingOrders}
          lockedFeatures={lockedFeatures}
        />
      </nav>
    );
  }

  return (
    <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
      <NavSection
        title="Boshqaruv"
        items={mainNav(cafe.id)}
        isActive={isActive}
        onNavigate={onNavigate}
        defaultOpen
        productCount={productCount}
        pendingOrders={pendingOrders}
        lockedFeatures={lockedFeatures}
      />
      <NavSection
        title="Sozlamalar"
        items={settingsNav(cafe.id)}
        isActive={isActive}
        onNavigate={onNavigate}
        productCount={productCount}
        pendingOrders={pendingOrders}
        lockedFeatures={lockedFeatures}
      />
      <NavSection
        title="Xodim oynalari"
        items={staffNav(cafe.id)}
        isActive={isActive}
        onNavigate={onNavigate}
        productCount={productCount}
        pendingOrders={pendingOrders}
        defaultOpen={productCount === 0 || pendingOrders > 0}
        lockedFeatures={lockedFeatures}
      />
    </nav>
  );
}

function SidebarFooter({
  userName,
  userId,
  cafeId,
  onThemeChange,
}: {
  userName: string;
  userId?: string;
  cafeId?: string;
  onThemeChange?: (theme: DashboardThemeId) => void;
}) {
  return (
    <div
      className="space-y-2 px-4 py-3"
      style={{
        borderTop: "1px solid var(--dp-sidebar-border)",
        background: "var(--dp-footer-bg)",
      }}
    >
      <p className="truncate text-sm font-medium text-[var(--dp-sidebar-fg)]">{userName}</p>
      <div className="flex items-center gap-2">
        {cafeId ? (
          <DashboardAppearanceMenu cafeId={cafeId} compact onThemeChange={onThemeChange} />
        ) : null}
        {cafeId && userId ? (
          <StaffChatWidget
            cafeId={cafeId}
            userId={userId}
            userName={userName}
            variant="icon"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--dp-sidebar-border)] bg-[var(--dp-nav-hover)] text-[var(--dp-sidebar-fg)] transition hover:opacity-90"
          />
        ) : null}
        {cafeId ? (
          <AppNotificationsBell cafeId={cafeId} placement="sidebar" />
        ) : null}
        <LogoutButton />
      </div>
    </div>
  );
}

function NavSection({
  title,
  items,
  isActive,
  onNavigate,
  defaultOpen = false,
  productCount = 0,
  pendingOrders = 0,
  lockedFeatures = {},
}: {
  title: string;
  items: NavItem[];
  isActive: (item: NavItem) => boolean;
  onNavigate?: () => void;
  defaultOpen?: boolean;
  productCount?: number;
  pendingOrders?: number;
  lockedFeatures?: Partial<Record<keyof PlanFeatures, boolean>>;
}) {
  const hasActiveChild = items.some(isActive);
  const [open, setOpen] = useState(defaultOpen || hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  useEffect(() => {
    if (pendingOrders > 0 && items.some((i) => i.orderBadge)) setOpen(true);
  }, [pendingOrders, items]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 hover:bg-[var(--dp-nav-hover)]"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--dp-sidebar-muted)] transition-colors group-hover:text-[var(--dp-sidebar-fg)]">
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--dp-sidebar-muted)] transition-transform duration-300 ease-in-out group-hover:text-[var(--dp-sidebar-fg)] ${
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
          <ul className="mt-1 space-y-0.5 pb-1">
            {items.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              const locked = Boolean(item.feature && lockedFeatures[item.feature]);
              const shopping = item.accent === "shopping";
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={locked ? "Yuqori tarifda ochiladi" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                      shopping
                        ? active
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-900/30 ring-1 ring-emerald-300/40"
                          : "bg-emerald-500/18 text-emerald-300 ring-1 ring-emerald-400/35 hover:bg-emerald-500/28 hover:text-emerald-200"
                        : active
                          ? "dp-nav-active"
                          : "dp-nav-item"
                    }`}
                  >
                    <Icon
                      className={`h-[18px] w-[18px] shrink-0 ${
                        shopping ? "text-inherit" : "dp-nav-icon"
                      }`}
                      strokeWidth={active || shopping ? 2.25 : 1.75}
                    />
                    <span
                      className={`truncate ${locked ? "opacity-80" : ""} ${
                        shopping ? "font-semibold tracking-wide" : ""
                      }`}
                    >
                      {item.label}
                    </span>
                    {locked && (
                      <Lock
                        className="ml-auto h-3.5 w-3.5 shrink-0 text-[var(--dp-accent)]"
                        strokeWidth={2.25}
                        aria-label="Tarif bilan cheklangan"
                      />
                    )}
                    {!locked && item.menuWarning && productCount === 0 && (
                      <span
                        className="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300"
                        style={{ background: "rgba(245, 158, 11, 0.22)" }}
                        title="Menyu bo'sh"
                      >
                        !
                      </span>
                    )}
                    {!locked && item.orderBadge && pendingOrders > 0 && (
                      <span
                        className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ background: "var(--dp-accent)" }}
                        title="Yangi buyurtmalar"
                      >
                        {pendingOrders}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({
  cafes,
  cafe,
  userId,
  userName,
  warehouseOnly = false,
  children,
}: {
  cafes: CafeOption[];
  cafe: CafeOption | undefined;
  userId: string;
  userName: string;
  warehouseOnly?: boolean;
  children: React.ReactNode;
}) {
  useHardwareBackGuard(true);
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [liveTheme, setLiveTheme] = useState<DashboardThemeId | null>(null);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [lockedFeatures, setLockedFeatures] = useState<
    Partial<Record<keyof PlanFeatures, boolean>>
  >({});

  function toggleDesktopSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const activeCafe = useMemo(() => {
    const match = pathname.match(/^\/dashboard\/([^/]+)/);
    const idFromPath = match?.[1];
    if (idFromPath) {
      return cafes.find((c) => c.id === idFromPath) ?? cafe ?? cafes[0];
    }
    return cafe ?? cafes[0];
  }, [pathname, cafes, cafe]);

  useEffect(() => {
    if (!warehouseOnly || !activeCafe?.id) return;
    const allowed = pathname.startsWith(`/dashboard/${activeCafe.id}/warehouse`);
    if (!allowed) {
      router.replace(`/dashboard/${activeCafe.id}/warehouse`);
    }
  }, [warehouseOnly, activeCafe?.id, pathname, router]);

  const dashboardTheme = dashboardThemeClass(
    liveTheme ?? activeCafe?.dashboardTheme ?? "CLASSIC",
  );

  function handleThemeChange(theme: DashboardThemeId) {
    setLiveTheme(theme);
  }

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  const productCount = activeCafe?.productCount ?? 0;

  useEffect(() => {
    function onPending(e: Event) {
      const detail = (e as CustomEvent<{ cafeId: string; count: number }>).detail;
      if (detail?.cafeId === activeCafe?.id) setPendingOrders(detail.count);
    }
    window.addEventListener("kafe:pending-orders", onPending);
    return () => window.removeEventListener("kafe:pending-orders", onPending);
  }, [activeCafe?.id]);

  useEffect(() => {
    if (!activeCafe?.id) {
      setLockedFeatures({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/cafes/${activeCafe.id}/subscription`);
        if (!res.ok) return;
        const json = (await res.json()) as { features?: PlanFeatures };
        if (cancelled || !json.features) return;
        const next: Partial<Record<keyof PlanFeatures, boolean>> = {};
        for (const [key, enabled] of Object.entries(json.features)) {
          if (!enabled) next[key as keyof PlanFeatures] = true;
        }
        setLockedFeatures(next);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCafe?.id]);

  const expandedSidebar = activeCafe ? (
    <>
      <SidebarBrand cafe={activeCafe} />
      <CafeSwitcher cafes={cafes} activeCafeId={activeCafe.id} variant="dashboard" />
      <SidebarNav
        cafe={activeCafe}
        productCount={productCount}
        pendingOrders={pendingOrders}
        isActive={isActive}
        onNavigate={() => setMobileOpen(false)}
        lockedFeatures={lockedFeatures}
        warehouseOnly={warehouseOnly}
      />
      {!warehouseOnly && (
        <div className="shrink-0 px-4 pb-1.5 pt-1">
          <DashboardPlanUpgradeCard cafeId={activeCafe.id} />
        </div>
      )}
      <SidebarFooter
        userName={userName}
        userId={userId}
        cafeId={warehouseOnly ? undefined : activeCafe.id}
        onThemeChange={warehouseOnly ? undefined : handleThemeChange}
      />
    </>
  ) : (
    <>
      <SidebarBrand cafe={activeCafe} />
      <SidebarFooter userName={userName} userId={userId} />
    </>
  );

  const sidebarStyle = { borderColor: "var(--dp-sidebar-border)" };
  const desktopSidebarWidth =
    warehouseOnly || !sidebarCollapsed
      ? SIDEBAR_WIDTH_EXPANDED
      : SIDEBAR_WIDTH_COLLAPSED;

  return (
    <div className="dashboard-panel flex min-h-screen" data-dp-theme={dashboardTheme}>
      <SessionWatchdog />
      {activeCafe && !warehouseOnly && (
        <CafeOrderNotifier cafeId={activeCafe.id} cafeName={activeCafe.name} />
      )}
      {activeCafe && !warehouseOnly && <PlanUpsellPopup cafeId={activeCafe.id} />}

      {/* Desktop: yig'iladigan sidebar */}
      <aside
        className={`dp-sidebar fixed inset-y-0 left-0 hidden flex-col border-r lg:flex ${
          sidebarCollapsed ? "z-40" : "z-30"
        }`}
        style={{
          ...sidebarStyle,
          width: desktopSidebarWidth,
        }}
        data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
      >
        <div className="dp-sidebar-inner flex min-h-0 flex-1 flex-col">
          {sidebarCollapsed && activeCafe && !warehouseOnly ? (
            <SidebarRail
              cafe={activeCafe}
              userId={userId}
              userName={userName}
              productCount={productCount}
              pendingOrders={pendingOrders}
              isActive={isActive}
              onThemeChange={handleThemeChange}
            />
          ) : (
            expandedSidebar
          )}
        </div>
        {!warehouseOnly && (
          <SidebarEdgeHandle collapsed={sidebarCollapsed} onToggle={toggleDesktopSidebar} />
        )}
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          aria-label="Menyuni yopish"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`dp-sidebar fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={sidebarStyle}
      >
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: "1px solid var(--dp-border-subtle)" }}
        >
          <ThemeToggle className="dp-on-card" />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="dp-sidebar-toggle flex h-9 w-9 items-center justify-center"
            aria-label="Yopish"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {expandedSidebar}
      </aside>

      <div
        className={`flex min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-out ${
          sidebarCollapsed ? "lg:ml-[88px]" : "lg:ml-[272px]"
        }`}
      >
        <header
          className="flex shrink-0 items-center gap-3 border-b bg-[var(--dp-sidebar)] px-4 py-3 lg:hidden"
          style={{ borderColor: "var(--dp-sidebar-border)" }}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="dp-sidebar-toggle flex h-9 w-9 items-center justify-center"
            aria-label="Menyu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--dp-sidebar-fg)]">
            {activeCafe?.name ?? "Kafe paneli"}
          </p>
          {activeCafe?.id ? (
            <StaffChatWidget
              cafeId={activeCafe.id}
              userId={userId}
              userName={userName}
              variant="icon"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--dp-sidebar-border)] bg-[var(--dp-nav-hover)] text-[var(--dp-sidebar-fg)] transition hover:opacity-90"
            />
          ) : null}
          <AppNotificationsBell cafeId={activeCafe?.id} />
          <ThemeToggle className="dp-on-card" />
        </header>

        <main className="dp-main min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

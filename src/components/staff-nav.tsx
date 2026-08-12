"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  ChefHat,
  Lock,
  LogOut,
  Menu,
  Monitor,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MenuSetupBanner } from "@/components/menu-setup-banner";
import { CafeOrderNotifier } from "@/components/cafe-order-notifier";
import { WaiterCallNotifier } from "@/components/waiter-call-notifier";
import { StaffPushPrompt } from "@/components/staff-push-prompt";
import { StaffAccountPanel } from "@/components/staff-account-panel";
import { AppNotificationsBell } from "@/components/app-notifications-bell";
import { lockStaffScreen } from "@/lib/staff-pin-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { StaffChatWidget } from "@/components/staff-chat-widget";

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "cashier", label: "Kassa", icon: Wallet },
  { href: "kitchen", label: "Oshxona", icon: ChefHat },
  { href: "display", label: "TV ekran", icon: Monitor },
  { href: "staff", label: "Ofitsiant", icon: Bell },
];

export function StaffNav({
  cafeId,
  cafeName,
  active,
  userName,
  userId,
  userRole: _userRole,
  waiterOnly = false,
  cashierOnly = false,
  kitchenOnly = false,
  productCount,
}: {
  cafeId: string;
  cafeName?: string;
  active: (typeof links)[number]["href"];
  userName?: string;
  userId?: string;
  userRole?: string;
  waiterOnly?: boolean;
  cashierOnly?: boolean;
  kitchenOnly?: boolean;
  productCount?: number;
}) {
  const pathname = usePathname();
  const visibleLinks = waiterOnly
    ? links.filter((l) => l.href === "staff")
    : cashierOnly
      ? links.filter((l) => l.href === "cashier")
      : kitchenOnly
        ? links.filter((l) => l.href === "kitchen")
        : links;
  const staffOnlyMode = waiterOnly || cashierOnly || kitchenOnly;
  const roleBadge = cashierOnly
    ? "Kassir"
    : waiterOnly
      ? "Ofitsiant"
      : kitchenOnly
        ? "Oshxona"
        : "Xodim rejimi";
  const pushRole = cashierOnly
    ? "cashier"
    : waiterOnly
      ? "waiter"
      : kitchenOnly
        ? "kitchen"
        : "staff";
  const showChat = Boolean(userId && userName);
  const [pinReady, setPinReady] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState(userName ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(userName ?? "");
  }, [userName]);

  useEffect(() => {
    if (!mobileMenuOpen && !settingsOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen, settingsOpen]);

  useEffect(() => {
    fetch(`/api/cafes/${cafeId}/waiter/profile`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.profile) {
          setDisplayName(d.profile.name || userName || "");
          setAvatarUrl(d.profile.avatarUrl || null);
        }
      })
      .catch(() => {});
  }, [cafeId, userName]);

  useEffect(() => {
    function syncPin() {
      fetch(`/api/cafes/${cafeId}/staff/pin`)
        .then((r) => r.json())
        .then((d) => {
          setHasPin(Boolean(d.hasPin));
          setPinReady(Boolean(d.hasPin && d.unlocked));
        })
        .catch(() => {
          setHasPin(false);
          setPinReady(false);
        });
    }
    syncPin();
    function onLocked() {
      setPinReady(false);
    }
    function onUnlocked() {
      syncPin();
    }
    window.addEventListener("kafe:staff-pin-locked", onLocked);
    window.addEventListener("kafe:staff-pin-unlocked", onUnlocked);
    window.addEventListener("kafe:staff-pin-reset", onLocked);
    return () => {
      window.removeEventListener("kafe:staff-pin-locked", onLocked);
      window.removeEventListener("kafe:staff-pin-unlocked", onUnlocked);
      window.removeEventListener("kafe:staff-pin-reset", onLocked);
    };
  }, [cafeId]);

  async function handleLock() {
    await lockStaffScreen(cafeId);
    setPinReady(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  }

  if (active === "cashier") {
    const initial = (displayName || cafeName || "A").slice(0, 1).toUpperCase();
    const statusOnline = pinReady || !hasPin;
    const statusLabel = hasPin ? (pinReady ? "Onlayn" : "Qulflangan") : "Onlayn";

    function openSettings() {
      setMobileMenuOpen(false);
      setSettingsOpen(true);
    }

    const navItems = (
      <>
        {visibleLinks.map((link) => {
          const href = `/${link.href}/${cafeId}`;
          const isActive = active === link.href || pathname === href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className={`cashier-pos-nav-item ${isActive && !settingsOpen ? "is-active" : ""}`}
            >
              <Icon className="h-4 w-4" strokeWidth={isActive && !settingsOpen ? 2.35 : 1.85} />
              <span>{link.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={openSettings}
          className={`cashier-pos-nav-item ${settingsOpen ? "is-active" : ""}`}
        >
          <Settings className="h-4 w-4" strokeWidth={settingsOpen ? 2.35 : 1.85} />
          <span>Sozlamalar</span>
        </button>
        {!staffOnlyMode && (
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="cashier-pos-nav-item cashier-pos-nav-desktop-only"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kafe paneli</span>
          </Link>
        )}
      </>
    );

    return (
      <>
        <WaiterCallNotifier cafeId={cafeId} />
        <StaffPushPrompt cafeId={cafeId} role={pushRole} />

        <header className="cashier-pos-mobile-bar">
          <button
            type="button"
            className="cashier-pos-icon-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menyu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="cashier-pos-mobile-identity">
            <div className={`cashier-pos-avatar-wrap is-compact ${statusOnline ? "is-online" : "is-locked"}`}>
              <div className="cashier-pos-avatar">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" />
                ) : (
                  initial
                )}
              </div>
            </div>
            <div className="min-w-0">
              <p className="cashier-pos-mobile-name">{displayName || roleBadge}</p>
              <p className={`cashier-pos-status ${statusOnline ? "is-online" : "is-locked"}`}>
                <span />
                {statusLabel}
              </p>
            </div>
          </div>
          <div className="cashier-pos-mobile-actions">
            <AppNotificationsBell cafeId={cafeId} />
            <button
              type="button"
              className="cashier-pos-icon-btn"
              onClick={openSettings}
              aria-label="Sozlamalar"
            >
              <Settings className="h-4 w-4" />
            </button>
            {pinReady && (
              <button
                type="button"
                className="cashier-pos-icon-btn"
                onClick={handleLock}
                aria-label="Qulflash"
              >
                <Lock className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        {mobileMenuOpen && (
          <button
            type="button"
            className="cashier-pos-drawer-backdrop"
            aria-label="Menyuni yopish"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <aside className={`cashier-pos-sidebar ${mobileMenuOpen ? "is-open" : ""}`}>
          <div className="cashier-pos-sidebar-mobile-head">
            <p className="cashier-pos-role">{roleBadge}</p>
            <button
              type="button"
              className="cashier-pos-icon-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Yopish"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="cashier-pos-profile">
            <div className={`cashier-pos-avatar-wrap ${statusOnline ? "is-online" : "is-locked"}`}>
              <div className="cashier-pos-avatar">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" />
                ) : (
                  initial
                )}
              </div>
            </div>
            <p className="cashier-pos-welcome">
              {cashierOnly ? "Welcome" : "Welcome Admin"}
            </p>
            {displayName && <p className="cashier-pos-user">{displayName}</p>}
            {cafeName && <p className="cashier-pos-user">{cafeName}</p>}
            <p className={`cashier-pos-status ${statusOnline ? "is-online" : "is-locked"}`}>
              <span />
              {statusLabel}
            </p>
          </div>

          <nav className="cashier-pos-nav">
            {navItems}
            {showChat && (
              <div className="mt-1">
                <StaffChatWidget
                  cafeId={cafeId}
                  userId={userId!}
                  userName={userName!}
                  className="cashier-pos-nav-item w-full"
                />
              </div>
            )}
          </nav>

          <div className="cashier-pos-sidebar-foot">
            {!staffOnlyMode && (
              <Link href="/dashboard" className="cashier-pos-nav-item">
                <ArrowLeft className="h-4 w-4" />
                <span>Kafe paneli</span>
              </Link>
            )}
            <div className="cashier-pos-role">{roleBadge}</div>
            <div className="flex items-center justify-center gap-2">
              <AppNotificationsBell
                cafeId={cafeId}
                placement="sidebar"
                className="cashier-pos-nav-desktop-only"
              />
              <ThemeToggle />
              {pinReady && (
                <button
                  type="button"
                  onClick={handleLock}
                  className="cashier-pos-icon-btn"
                  title="Ekranni qulflash"
                  aria-label="Ekranni qulflash"
                >
                  <Lock className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={logout}
                className="cashier-pos-icon-btn"
                aria-label="Chiqish"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <nav className="cashier-pos-bottom-nav" aria-label="Asosiy menyu">
          {visibleLinks.map((link) => {
            const href = `/${link.href}/${cafeId}`;
            const isActive = active === link.href || pathname === href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={href}
                className={`cashier-pos-bottom-item ${isActive && !settingsOpen ? "is-active" : ""}`}
              >
                <Icon className="h-5 w-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          {showChat && (
            <StaffChatWidget
              cafeId={cafeId}
              userId={userId!}
              userName={userName!}
              className="cashier-pos-bottom-item relative"
            />
          )}
          <button
            type="button"
            onClick={openSettings}
            className={`cashier-pos-bottom-item ${settingsOpen ? "is-active" : ""}`}
          >
            <Settings className="h-5 w-5" />
            <span>Sozlamalar</span>
          </button>
          <button type="button" onClick={logout} className="cashier-pos-bottom-item">
            <LogOut className="h-5 w-5" />
            <span>Chiqish</span>
          </button>
        </nav>

        {settingsOpen && (
          <div className="cashier-account-overlay" role="presentation">
            <div className="cashier-account-overlay-backdrop" onClick={() => setSettingsOpen(false)} />
            <StaffAccountPanel
              cafeId={cafeId}
              roleLabel={roleBadge}
              userId={userId}
              onClose={() => setSettingsOpen(false)}
              onProfileSaved={(profile) => {
                setDisplayName(profile.name);
                setAvatarUrl(profile.avatarUrl);
              }}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <WaiterCallNotifier cafeId={cafeId} />
      <StaffPushPrompt cafeId={cafeId} role={pushRole} />
      {active !== "cashier" && (
        <CafeOrderNotifier cafeId={cafeId} cafeName={cafeName} />
      )}
      <div className="dp-card staff-top-nav mb-3 overflow-hidden rounded-2xl sm:mb-4">
        {productCount === 0 && !cashierOnly && (
          <div className="border-b p-3" style={{ borderColor: "var(--dp-border-subtle)" }}>
            <MenuSetupBanner cafeId={cafeId} productCount={0} variant="compact" />
          </div>
        )}
        <div className="dp-section-bar flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4">
          <div className="min-w-0">
            {!staffOnlyMode && (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--dp-accent)] hover:opacity-80"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Kafe paneli
              </Link>
            )}
            {cafeName && (
              <p
                className={`truncate font-bold text-[var(--dp-bar-text)] ${!staffOnlyMode ? "mt-1" : ""}`}
              >
                {cafeName}
              </p>
            )}
            {userName && (
              <p className="dp-bar-muted truncate text-xs">{userName}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <AppNotificationsBell cafeId={cafeId} />
            <ThemeToggle />
            {pinReady && (
              <button
                type="button"
                onClick={handleLock}
                className="inline-flex items-center justify-center rounded-lg border p-2 text-[var(--dp-bar-muted)] transition hover:border-[var(--dp-accent)] hover:text-[var(--dp-bar-text)]"
                style={{ borderColor: "var(--dp-border)", background: "var(--dp-card)" }}
                title="Ekranni qulflash"
                aria-label="Ekranni qulflash"
              >
                <Lock className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-[var(--dp-bar-muted)] transition hover:border-[var(--dp-accent)] hover:text-[var(--dp-bar-text)]"
              style={{ borderColor: "var(--dp-border)", background: "var(--dp-card)" }}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Chiqish</span>
            </button>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--dp-tab-active-text)]"
              style={{ background: "var(--dp-tab-active-bg)" }}
            >
              {roleBadge}
            </span>
          </div>
        </div>
        {!cashierOnly && (
        <nav className="flex gap-1.5 overflow-x-auto p-2.5 scrollbar-none">
          {visibleLinks.map((link) => {
            const href = `/${link.href}/${cafeId}`;
            const isActive = active === link.href || pathname === href;
            const Icon = link.icon;
            const menuEmpty = productCount === 0 && link.href === "cashier";
            return (
              <Link
                key={link.href}
                href={href}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 sm:px-4 ${
                  isActive ? "dp-nav-active" : "dp-nav-item"
                } ${menuEmpty && !isActive ? "ring-1 ring-amber-500/40" : ""}`}
              >
                <Icon className="dp-nav-icon h-4 w-4" strokeWidth={isActive ? 2.25 : 1.75} />
                {link.label}
                {menuEmpty && (
                  <span
                    className="ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300"
                    style={{ background: "rgba(245, 158, 11, 0.22)" }}
                  >
                    !
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        )}
      </div>
      {showChat && (kitchenOnly || active === "kitchen") && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex border-t bg-[var(--dp-card)] px-2 py-1 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] lg:hidden"
          style={{
            borderColor: "var(--dp-border)",
            paddingBottom: "calc(0.35rem + env(safe-area-inset-bottom, 0px))",
          }}
          aria-label="Chat"
        >
          <StaffChatWidget
            cafeId={cafeId}
            userId={userId!}
            userName={userName!}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-black uppercase tracking-wider text-[var(--dp-muted)]"
          />
        </nav>
      )}
    </>
  );
}

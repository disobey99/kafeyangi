"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppNotificationsBell } from "@/components/app-notifications-bell";
import { NooklineMark } from "@/components/nookline-mark";
import { PlatformNav } from "@/components/platform-nav";
import {
  PlatformInstallButton,
  PlatformInstallHint,
  PlatformInstallProvider,
} from "@/components/platform-install-hint";
import { BrandIntroSplash } from "@/components/brand-intro-splash";
import type { PlatformAccessPerms } from "@/lib/platform-permissions";

type Props = {
  companyName: string;
  userName: string;
  userEmail: string;
  permissions: PlatformAccessPerms;
  children: React.ReactNode;
};

export function PlatformShell({
  companyName,
  userName,
  userEmail,
  permissions,
  children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    // Oldingi modal/drawer qotirib qo'ygan scrollni ochish
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }, []);

  useEffect(() => {
    if (!drawerOpen) {
      document.body.style.overflow = "";
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const sidebarFooter = (
    <div className="platform-sidebar-section border-t p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <ThemeToggle className="!h-10 !w-10 !rounded-xl" />
        <div className="flex items-center gap-1">
          <span className="hidden md:inline-flex">
            <PlatformInstallButton />
          </span>
          <AppNotificationsBell />
        </div>
      </div>
      <p className="platform-title truncate text-sm font-medium">{userName}</p>
      <p className="platform-muted truncate text-xs">{userEmail}</p>
      <LogoutButton />
    </div>
  );

  const brand = (
    <Link
      href="/platform"
      className="flex items-center gap-3"
      onClick={() => setDrawerOpen(false)}
    >
      <NooklineMark
        size={40}
        className="shadow-md shadow-emerald-900/15 dark:shadow-black/40"
      />
      <div className="min-w-0">
        <p className="platform-title truncate font-bold">{companyName}</p>
        <p className="platform-accent-text text-xs">Platforma admin</p>
      </div>
    </Link>
  );

  return (
    <PlatformInstallProvider>
      <BrandIntroSplash
        title={companyName || "Nookline"}
        subtitle="Platforma"
        storageKey="nookline-platform-intro-seen"
        durationMs={2000}
      />
      <div className="platform-shell flex min-h-full flex-col md:flex-row">
        <aside className="platform-sidebar hidden w-64 shrink-0 flex-col border-r md:flex">
          <div className="platform-sidebar-section border-b p-6">{brand}</div>
          <PlatformNav permissions={permissions} />
          {sidebarFooter}
        </aside>

        <header className="platform-mobile-bar sticky top-0 z-30 flex items-center gap-2 border-b px-3 py-2.5 md:hidden">
          <button
            type="button"
            className="platform-mobile-menu-btn inline-flex h-10 w-10 items-center justify-center rounded-xl"
            aria-label="Menyu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            href="/platform"
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <NooklineMark size={32} />
            <div className="min-w-0">
              <p className="platform-title truncate text-sm font-bold">
                {companyName}
              </p>
              <p className="platform-accent-text truncate text-[10px]">
                Platforma
              </p>
            </div>
          </Link>
          <PlatformInstallButton />
          <AppNotificationsBell />
        </header>

        {drawerOpen && (
          <div className="platform-drawer-root fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="platform-drawer-backdrop absolute inset-0"
              aria-label="Yopish"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="platform-drawer-panel absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r shadow-xl">
              <div className="platform-sidebar-section flex items-start justify-between gap-2 border-b p-4">
                {brand}
                <button
                  type="button"
                  className="platform-mobile-menu-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  aria-label="Yopish"
                  onClick={() => setDrawerOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <PlatformNav
                permissions={permissions}
                onNavigate={() => setDrawerOpen(false)}
              />
              {sidebarFooter}
            </aside>
          </div>
        )}

        <main className="platform-main min-w-0 flex-1 overflow-auto p-4 md:p-8">
          <PlatformInstallHint />
          {children}
        </main>
      </div>
    </PlatformInstallProvider>
  );
}

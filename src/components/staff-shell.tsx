"use client";

import { ThemeToggle } from "@/components/theme-toggle";

export function StaffShell({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "cashier" | "waiter";
}) {
  return (
    <div
      className={`dashboard-panel min-h-screen text-[var(--dp-text)] ${
        variant === "cashier"
          ? "cashier-premium-shell"
          : variant === "waiter"
            ? "waiter-mobile-shell bg-[var(--dp-bg)]"
            : "bg-[var(--dp-bg)]"
      }`}
    >
      <div
        className={`mx-auto w-full max-w-7xl ${
          variant === "cashier"
            ? "cashier-shell-inner px-3 py-3 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:px-4 sm:py-5 md:px-6 md:pb-8"
            : variant === "waiter"
              ? "flex min-h-[100dvh] w-full max-w-full flex-col overflow-x-hidden px-3 py-3 sm:px-4 sm:py-5 md:px-6 md:py-8 lg:max-w-7xl"
              : "px-4 py-5 sm:px-6 md:py-8"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/** TV ekran — faqat tema tugmasi, qora fon saqlanadi */
export function DisplayShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-panel min-h-screen bg-black text-white">
      <div className="absolute right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}

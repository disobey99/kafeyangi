"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";

type ThemeToggleProps = {
  className?: string;
  showLabel?: boolean;
};

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`dp-on-card flex items-center justify-center gap-2 rounded-xl border transition duration-200 ${
        showLabel ? "h-10 w-full px-3" : "h-9 w-9"
      } border-[var(--dp-border,var(--border))] bg-[var(--dp-card,var(--surface))] text-[var(--dp-on-card-muted,var(--dp-muted,var(--muted)))] hover:border-[var(--dp-accent,var(--brand))] hover:text-[var(--dp-accent,var(--brand))] ${className}`}
      aria-label={isDark ? "Kun rejimi" : "Tun rejimi"}
      title={isDark ? "Kun rejimi" : "Tun rejimi"}
    >
      {!mounted ? null : isDark ? (
        <Sun className="h-4 w-4 shrink-0" />
      ) : (
        <Moon className="h-4 w-4 shrink-0" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? "Kun rejimi" : "Tun rejimi"}
        </span>
      )}
    </button>
  );
}

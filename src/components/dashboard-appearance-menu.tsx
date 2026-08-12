"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Palette } from "lucide-react";
import { DashboardThemePicker } from "@/components/dashboard-theme-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import type { DashboardThemeId } from "@/lib/dashboard-themes";

const POPOVER_WIDTH = 288; // 18rem

export function DashboardAppearanceMenu({
  cafeId,
  onThemeChange,
  compact = false,
}: {
  cafeId?: string;
  onThemeChange?: (theme: DashboardThemeId) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const gap = 8;
      const width = Math.min(POPOVER_WIDTH, window.innerWidth - 16);
      const maxHeight = Math.min(420, window.innerHeight - 24);

      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

      const spaceAbove = rect.top - gap;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const openUp = spaceAbove >= 200 || spaceAbove >= spaceBelow;

      if (openUp) {
        const bottom = window.innerHeight - rect.top + gap;
        setPanelStyle({
          position: "fixed",
          left,
          bottom,
          width,
          maxHeight: Math.min(maxHeight, spaceAbove),
          zIndex: 200,
        });
      } else {
        setPanelStyle({
          position: "fixed",
          left,
          top: rect.bottom + gap,
          width,
          maxHeight: Math.min(maxHeight, spaceBelow),
          zIndex: 200,
        });
      }
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      const panel = document.getElementById("dp-appearance-popover");
      if (panel?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const button = compact ? (
    <button
      ref={btnRef}
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--dp-sidebar-border)] bg-[var(--dp-nav-hover)] text-[var(--dp-sidebar-fg)] transition hover:border-[var(--dp-accent)] hover:text-[var(--dp-accent)]"
      aria-label="Ko'rinish sozlamalari"
      title="Ko'rinish"
      aria-expanded={open}
    >
      <Palette className="h-4 w-4" strokeWidth={2.25} />
    </button>
  ) : (
    <button
      ref={btnRef}
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--dp-sidebar-border)] bg-[var(--dp-nav-hover)] px-3 py-2.5 text-sm font-medium text-[var(--dp-sidebar-fg)] transition hover:border-[var(--dp-accent)] hover:text-[var(--dp-accent)]"
      aria-expanded={open}
    >
      <Palette className="h-4 w-4 shrink-0" strokeWidth={2} />
      Ko&apos;rinish
    </button>
  );

  return (
    <div ref={rootRef} className="relative">
      {button}
      {mounted &&
        open &&
        cafeId &&
        createPortal(
          <div
            id="dp-appearance-popover"
            className="overflow-y-auto rounded-2xl border p-4 shadow-xl"
            style={{
              ...panelStyle,
              borderColor: "var(--dp-border)",
              background: "var(--dp-card)",
            }}
            role="dialog"
            aria-label="Ko'rinish sozlamalari"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--dp-muted)]">
              Tun / kun rejimi
            </p>
            <div className="mt-2">
              <ThemeToggle showLabel className="w-full" />
            </div>

            <div
              className="my-4 h-px"
              style={{ background: "var(--dp-border-subtle)" }}
            />

            <DashboardThemePicker
              cafeId={cafeId}
              popover
              onThemeChange={(theme) => {
                onThemeChange?.(theme);
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

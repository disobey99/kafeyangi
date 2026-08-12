"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";

const HELP_TEXT = {
  title: "Variantlar (modifikator) nima?",
  body: "Asosiy taomni bosish — oddiy narxda. «Variant» tugmasi orqali Kichik/Katta yoki qo'shimchalar ixtiyoriy tanlanadi. «Majburiy» belgilansa, tanlash shart bo'ladi.",
  example: "Misol: Osh (oddiy) yoki Osh → Katta (+15 000 so'm)",
};

type PopoverPos = { top: number; left: number; width: number; placement: "above" | "below" };

type PopoverTheme = {
  bg: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  subtle: string;
};

function readPopoverTheme(anchor: HTMLButtonElement | null): PopoverTheme {
  const panel =
    anchor?.closest(".dashboard-panel") ?? document.querySelector(".dashboard-panel");
  const isDark = document.documentElement.classList.contains("dark");

  if (panel) {
    const s = getComputedStyle(panel);
    const pick = (name: string, fallback: string) =>
      s.getPropertyValue(name).trim() || fallback;

    return {
      bg: pick("--dp-card", isDark ? "#1c1c21" : "#ffffff"),
      text: pick("--dp-text", isDark ? "#f4f4f5" : "#1c1917"),
      muted: pick("--dp-muted", isDark ? "#a1a1aa" : "#78716c"),
      border: pick("--dp-border", isDark ? "#2e2e35" : "#e7e5e4"),
      accent: pick("--dp-accent", "#d97706"),
      accentSoft: pick("--dp-accent-soft", "rgba(217, 119, 6, 0.14)"),
      subtle: pick("--dp-subtle", isDark ? "#d4d4d8" : "#57534e"),
    };
  }

  return {
    bg: isDark ? "#1c1c21" : "#ffffff",
    text: isDark ? "#f4f4f5" : "#1c1917",
    muted: isDark ? "#a1a1aa" : "#78716c",
    border: isDark ? "#2e2e35" : "#e7e5e4",
    accent: "#d97706",
    accentSoft: "rgba(217, 119, 6, 0.14)",
    subtle: isDark ? "#d4d4d8" : "#57534e",
  };
}

function usePopoverPosition(
  open: boolean,
  anchorRef: React.RefObject<HTMLButtonElement | null>,
) {
  const [pos, setPos] = useState<PopoverPos | null>(null);

  const update = useCallback(() => {
    const btn = anchorRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.min(window.innerWidth - 24, 288);
    const left = Math.min(
      Math.max(12, rect.right - width),
      window.innerWidth - width - 12,
    );
    const panelHeight = 168;
    const gap = 8;
    const fitsAbove = rect.top - panelHeight - gap > 8;
    const placement = fitsAbove ? "above" : "below";
    const top = fitsAbove ? rect.top - gap : rect.bottom + gap;
    setPos({ top, left, width, placement });
  }, [anchorRef]);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  return { pos, update };
}

export function ModifierHelpHint({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<PopoverTheme | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { pos } = usePopoverPosition(open, btnRef);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setTheme(null);
      return;
    }
    setTheme(readPopoverTheme(btnRef.current));
  }, [open, pos]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-modifier-help-popover]")) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const popover =
    open && pos && theme && mounted
      ? createPortal(
          <div
            data-modifier-help-popover
            className="modifier-help-popover fixed z-[200] rounded-xl border p-3 text-left"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              transform: pos.placement === "above" ? "translateY(-100%)" : undefined,
              backgroundColor: theme.bg,
              borderColor: theme.border,
              color: theme.text,
              boxShadow: "0 18px 48px rgba(0, 0, 0, 0.45)",
            }}
            role="dialog"
            aria-label="Variantlar haqida"
          >
            <p className="text-sm font-semibold" style={{ color: theme.text }}>
              {HELP_TEXT.title}
            </p>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: theme.muted }}>
              {HELP_TEXT.body}
            </p>
            <p
              className="mt-2 rounded-lg px-2 py-1.5 text-[11px]"
              style={{ background: theme.accentSoft, color: theme.subtle }}
            >
              {HELP_TEXT.example}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 text-[11px] font-medium"
              style={{ color: theme.accent }}
            >
              Tushundim
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center justify-center rounded-full transition hover:bg-[var(--dp-accent)]/10 ${
          compact ? "h-7 w-7" : "h-8 w-8"
        }`}
        aria-label="Variantlar haqida ma'lumot"
        aria-expanded={open}
      >
        <HelpCircle
          className={`text-[var(--dp-muted)] hover:text-[var(--dp-accent)] ${compact ? "h-4 w-4" : "h-4 w-4"}`}
        />
      </button>
      {popover}
    </div>
  );
}

export function ModifierHelpBanner() {
  return (
    <div
      className="mb-4 rounded-xl border px-3 py-2.5 text-xs leading-relaxed"
      style={{
        borderColor: "var(--dp-border)",
        background: "var(--dp-accent-soft)",
        color: "var(--dp-subtle)",
      }}
    >
      <span className="font-semibold text-[var(--dp-text)]">Variantlar</span> — mijoz buyurtmada
      tanlaydigan qo&apos;shimchalar (hajm, go&apos;sht turi, qo&apos;shimcha ingredient).{" "}
      <span className="text-[var(--dp-muted)]">{HELP_TEXT.example}</span>
    </div>
  );
}

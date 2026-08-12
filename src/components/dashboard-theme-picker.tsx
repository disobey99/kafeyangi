"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Palette } from "lucide-react";
import type { DashboardThemeId } from "@/lib/dashboard-themes";
import { applyDashboardThemeLive } from "@/lib/dashboard-themes";

type ThemeOption = {
  id: DashboardThemeId;
  label: string;
  description: string;
  swatches: [string, string, string];
};

type DashboardThemePickerProps = {
  cafeId: string;
  compact?: boolean;
  popover?: boolean;
  onThemeChange?: (theme: DashboardThemeId) => void;
};

export function DashboardThemePicker({
  cafeId,
  compact = false,
  popover = false,
  onThemeChange,
}: DashboardThemePickerProps) {
  const router = useRouter();
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [active, setActive] = useState<DashboardThemeId>("CLASSIC");
  const [canCustomize, setCanCustomize] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<DashboardThemeId | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/cafes/${cafeId}/dashboard-theme`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Fon yuklanmadi");
          setLoading(false);
          return;
        }
        setThemes(data.themes ?? []);
        setActive(data.theme ?? "CLASSIC");
        setCanCustomize(data.canCustomize !== false);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Ulanish xatosi");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cafeId]);

  async function selectTheme(theme: DashboardThemeId) {
    if (theme === active || saving) return;
    if (!canCustomize) {
      setError("Obuna faol emas yoki ruxsat yo'q");
      return;
    }

    setSaving(theme);
    setError("");

    // Darhol ko'rinishi uchun
    applyDashboardThemeLive(theme);
    onThemeChange?.(theme);
    setActive(theme);

    try {
      const res = await fetch(`/api/cafes/${cafeId}/dashboard-theme`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Saqlanmadi");
        router.refresh();
        return;
      }
      setActive(data.theme);
      applyDashboardThemeLive(data.theme);
      onThemeChange?.(data.theme);
      router.refresh();
    } catch {
      setError("Ulanish xatosi");
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <p className={`text-xs text-[var(--dp-sidebar-muted,var(--dp-muted))] ${compact ? "px-1 py-2" : ""}`}>
        Fon yuklanmoqda...
      </p>
    );
  }

  const isInlineCompact = compact && !popover;

  return (
    <div className={popover ? "space-y-2" : compact ? "space-y-2" : "space-y-4"}>
      {!compact && !popover && (
        <div>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-[var(--dp-accent)]" />
            <h2 className="font-semibold text-[var(--dp-text)]">Panel fon temasi</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--dp-muted)]">
            Boshqaruv paneli ranglarini tanlang — har birida sidebar va markaz boshqacha
          </p>
        </div>
      )}

      {isInlineCompact && (
        <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--dp-sidebar-muted)]">
          Fon temasi
        </p>
      )}

      {popover && (
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--dp-muted)]">
          Fon temasi
        </p>
      )}

      {!canCustomize && (
        <p
          className={`rounded-xl border px-3 py-2 text-xs text-amber-700 dark:text-amber-300 ${
            compact ? "" : "text-sm"
          }`}
          style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
        >
          Faol obuna kerak — sinov muddati tugagan bo&apos;lishi mumkin
        </p>
      )}

      <div
        className={`grid gap-2 ${
          compact || popover ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"
        } ${isInlineCompact ? "px-1" : ""}`}
      >
        {themes.map((theme) => {
          const selected = active === theme.id;
          const disabled = saving !== null;
          return (
            <button
              key={theme.id}
              type="button"
              disabled={disabled}
              onClick={() => selectTheme(theme.id)}
              title={theme.label}
              className={`group relative overflow-hidden rounded-2xl border text-left transition duration-200 dp-on-card ${
                compact || popover ? "p-2" : "p-3"
              } ${
                selected
                  ? "border-[var(--dp-accent)] ring-2 ring-[var(--dp-accent-soft)]"
                  : "border-[var(--dp-border)] hover:border-[var(--dp-accent)]"
              } ${!canCustomize && !selected ? "opacity-70" : ""}`}
              style={{ background: "var(--dp-card)" }}
            >
              <div className="flex gap-1">
                {theme.swatches.map((color) => (
                  <span
                    key={color}
                    className={`flex-1 rounded-md ${compact || popover ? "h-5" : "h-7"}`}
                    style={{ background: color }}
                  />
                ))}
              </div>
              {!compact && !popover && (
                <>
                  <p className="mt-2 text-sm font-semibold text-[var(--dp-text)]">{theme.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--dp-muted)]">{theme.description}</p>
                </>
              )}
              {(compact || popover) && (
                <p className="mt-1.5 truncate text-center text-[10px] font-medium text-[var(--dp-subtle)]">
                  {theme.label}
                </p>
              )}
              {selected && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--dp-accent)] text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
              {saving === theme.id && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-xs font-medium text-white">
                  ...
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

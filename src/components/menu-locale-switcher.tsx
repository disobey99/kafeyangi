"use client";

import { Globe } from "lucide-react";
import { MENU_LOCALE_LABELS, type MenuLocale } from "@/lib/menu-i18n";

export function MenuLocaleSwitcher({
  locale,
  onChange,
  variant = "dark",
  showLabel = false,
  label,
}: {
  locale: MenuLocale;
  onChange: (l: MenuLocale) => void;
  variant?: "light" | "dark";
  showLabel?: boolean;
  label?: string;
}) {
  const isLight = variant === "light";
  const labelText = label ?? "Til";
  return (
    <div className="flex flex-col items-end gap-1">
      {showLabel && (
        <span
          className={`flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide ${
            isLight ? "text-stone-500" : "text-white/80"
          }`}
        >
          <Globe className="h-3 w-3" />
          {labelText}
        </span>
      )}
      <div
        className={`flex shrink-0 gap-0.5 rounded-xl p-1 shadow-sm ${
          isLight ? "bg-stone-100 ring-1 ring-stone-200" : "bg-black/20 ring-1 ring-white/20"
        }`}
        role="group"
        aria-label="Menyu tili"
      >
        {(Object.keys(MENU_LOCALE_LABELS) as MenuLocale[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            title={MENU_LOCALE_LABELS[l]}
            className={`min-w-[2.25rem] rounded-lg px-2 py-1.5 text-xs font-bold transition ${
              locale === l
                ? "bg-white text-stone-900 shadow-sm"
                : isLight
                  ? "text-stone-600 hover:bg-white/60"
                  : "text-white hover:bg-white/15"
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

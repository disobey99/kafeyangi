"use client";

import type { MenuLocale } from "@/lib/menu-i18n";
import {
  MENU_FOOD_TAGS,
  menuFoodTagLabel,
  type MenuFoodTagId,
} from "@/lib/menu-food-tags";

export function MenuTagFilterBar({
  locale,
  activeTag,
  onChange,
  className = "",
}: {
  locale: MenuLocale;
  activeTag: MenuFoodTagId | null;
  onChange: (tag: MenuFoodTagId | null) => void;
  className?: string;
}) {
  return (
    <div className={`menu-tag-filter-bar ${className}`}>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`menu-tag-chip ${activeTag === null ? "is-active" : ""}`}
      >
        <span className="menu-tag-chip-emoji">✨</span>
        <span className="menu-tag-chip-label">
          {locale === "ru" ? "Все" : locale === "en" ? "All" : "Hammasi"}
        </span>
      </button>
      {MENU_FOOD_TAGS.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onChange(activeTag === tag.id ? null : tag.id)}
          className={`menu-tag-chip ${activeTag === tag.id ? "is-active" : ""}`}
          style={
            activeTag === tag.id
              ? ({ "--tag-gradient": tag.gradient } as React.CSSProperties)
              : undefined
          }
        >
          <span className="menu-tag-chip-emoji">{tag.emoji}</span>
          <span className="menu-tag-chip-label">{menuFoodTagLabel(tag, locale)}</span>
        </button>
      ))}
    </div>
  );
}

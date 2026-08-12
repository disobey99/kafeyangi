"use client";

import { getMenuFoodTag } from "@/lib/menu-food-tags";

export function MenuFoodVisual({
  menuTag,
  emoji,
  name,
  className = "",
}: {
  menuTag?: string | null;
  emoji?: string;
  name: string;
  className?: string;
}) {
  const tag = getMenuFoodTag(menuTag ?? null);
  const displayEmoji = emoji ?? tag?.emoji ?? "🍽️";

  return (
    <div
      className={`menu-food-visual ${className}`}
      style={{ background: tag?.gradient ?? "linear-gradient(145deg, #f59e0b, #d97706)" }}
      title={name}
      aria-hidden
    >
      <span className="menu-food-visual-shine" />
      <span className="menu-food-visual-emoji">{displayEmoji}</span>
    </div>
  );
}

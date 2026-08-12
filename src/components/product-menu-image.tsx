import { UtensilsCrossed } from "lucide-react";
import { MenuFoodVisual } from "@/components/menu-food-visual";

type Size = "sm" | "md" | "lg" | "card";

const sizeClass: Record<Exclude<Size, "card">, string> = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-20 w-20",
};

export function ProductMenuImage({
  url,
  name,
  menuTag,
  visualEmoji,
  size = "md",
}: {
  url: string | null | undefined;
  name: string;
  menuTag?: string | null;
  visualEmoji?: string;
  size?: Size;
}) {
  if (size === "card") {
    if (url?.trim()) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name}
          className="bistro-dish-img"
          loading="lazy"
        />
      );
    }
    if (menuTag) {
      return (
        <MenuFoodVisual
          menuTag={menuTag}
          emoji={visualEmoji}
          name={name}
          className="bistro-dish-img menu-food-visual-card"
        />
      );
    }
    return (
      <span className="bistro-dish-img bistro-dish-img-placeholder">
        <UtensilsCrossed className="h-10 w-10" strokeWidth={1.5} />
      </span>
    );
  }

  const cls = sizeClass[size];

  if (url?.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={`${cls} shrink-0 rounded-xl object-cover`}
        loading="lazy"
      />
    );
  }

  if (menuTag) {
    return (
      <MenuFoodVisual
        menuTag={menuTag}
        emoji={visualEmoji}
        name={name}
        className={`${cls} menu-food-visual-inline`}
      />
    );
  }

  return (
    <span
      className={`${cls} flex shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600`}
    >
      <UtensilsCrossed className={size === "sm" ? "h-4 w-4" : "h-6 w-6"} strokeWidth={1.75} />
    </span>
  );
}

import type { MenuLocale } from "@/lib/menu-i18n";

export type MenuFoodTagId =
  | "MILLIY"
  | "GOSHTLI"
  | "SUYUQ"
  | "KABOB"
  | "SALAT"
  | "ICHIMLIK"
  | "DESERT"
  | "FAST_FOOD";

export type MenuFoodTagDef = {
  id: MenuFoodTagId;
  emoji: string;
  labelUz: string;
  labelRu: string;
  labelEn: string;
  gradient: string;
};

export const MENU_FOOD_TAGS: MenuFoodTagDef[] = [
  {
    id: "MILLIY",
    emoji: "🍲",
    labelUz: "Milliy taomlar",
    labelRu: "Национальные",
    labelEn: "National",
    gradient: "linear-gradient(145deg, #f59e0b 0%, #d97706 45%, #b45309 100%)",
  },
  {
    id: "GOSHTLI",
    emoji: "🥩",
    labelUz: "Go'shtli",
    labelRu: "Мясные",
    labelEn: "Meat",
    gradient: "linear-gradient(145deg, #ef4444 0%, #dc2626 50%, #991b1b 100%)",
  },
  {
    id: "SUYUQ",
    emoji: "🍜",
    labelUz: "Suyuq taomlar",
    labelRu: "Первые блюда",
    labelEn: "Soups",
    gradient: "linear-gradient(145deg, #38bdf8 0%, #0ea5e9 50%, #0369a1 100%)",
  },
  {
    id: "KABOB",
    emoji: "🔥",
    labelUz: "Kabob & grill",
    labelRu: "Шашлык",
    labelEn: "Kebab",
    gradient: "linear-gradient(145deg, #fb923c 0%, #ea580c 50%, #c2410c 100%)",
  },
  {
    id: "SALAT",
    emoji: "🥗",
    labelUz: "Salatlar",
    labelRu: "Салаты",
    labelEn: "Salads",
    gradient: "linear-gradient(145deg, #4ade80 0%, #22c55e 50%, #15803d 100%)",
  },
  {
    id: "ICHIMLIK",
    emoji: "🥤",
    labelUz: "Ichimliklar",
    labelRu: "Напитки",
    labelEn: "Drinks",
    gradient: "linear-gradient(145deg, #a78bfa 0%, #8b5cf6 50%, #6d28d9 100%)",
  },
  {
    id: "DESERT",
    emoji: "🍰",
    labelUz: "Shirinliklar",
    labelRu: "Десерты",
    labelEn: "Desserts",
    gradient: "linear-gradient(145deg, #f472b6 0%, #ec4899 50%, #be185d 100%)",
  },
  {
    id: "FAST_FOOD",
    emoji: "🍔",
    labelUz: "Fast food",
    labelRu: "Фастфуд",
    labelEn: "Fast food",
    gradient: "linear-gradient(145deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
  },
];

export function getMenuFoodTag(id: string | null | undefined): MenuFoodTagDef | null {
  return MENU_FOOD_TAGS.find((t) => t.id === id) ?? null;
}

export function menuFoodTagLabel(tag: MenuFoodTagDef, locale: MenuLocale): string {
  if (locale === "ru") return tag.labelRu;
  if (locale === "en") return tag.labelEn;
  return tag.labelUz;
}

export const MENU_FOOD_TAG_ID_VALUES = MENU_FOOD_TAGS.map((t) => t.id) as [
  MenuFoodTagId,
  ...MenuFoodTagId[],
];

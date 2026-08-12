export type MenuLocale = "uz" | "ru" | "en";

export function pickLocalizedName(
  item: { name: string; nameRu?: string | null; nameEn?: string | null },
  locale: MenuLocale,
): string {
  if (locale === "ru" && item.nameRu?.trim()) return item.nameRu.trim();
  if (locale === "en" && item.nameEn?.trim()) return item.nameEn.trim();
  return item.name;
}

export function pickLocalizedDescription(
  item: {
    description?: string | null;
    descriptionRu?: string | null;
    descriptionEn?: string | null;
  },
  locale: MenuLocale,
): string | null {
  if (locale === "ru" && item.descriptionRu?.trim()) return item.descriptionRu.trim();
  if (locale === "en" && item.descriptionEn?.trim()) return item.descriptionEn.trim();
  return item.description?.trim() || null;
}

export const MENU_LOCALE_LABELS: Record<MenuLocale, string> = {
  uz: "O'zbek",
  ru: "Русский",
  en: "English",
};

export function parseMenuLocale(value: string | null | undefined): MenuLocale {
  if (value === "ru" || value === "en") return value;
  return "uz";
}

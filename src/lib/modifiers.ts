import { prisma } from "@/lib/prisma";
import { pickLocalizedName, type MenuLocale } from "@/lib/menu-i18n";

export type SelectedModifier = {
  groupId: string;
  optionId: string;
  label: string;
  priceDelta: number;
};

export async function resolveOrderItemModifiers(
  productId: string,
  optionIds: string[] | undefined,
  locale: MenuLocale = "uz",
): Promise<{ unitExtra: number; summary: string | null; selected: SelectedModifier[] }> {
  if (!optionIds?.length) {
    return { unitExtra: 0, summary: null, selected: [] };
  }

  const groups = await prisma.productModifierGroup.findMany({
    where: { productId },
    include: { options: true },
    orderBy: { sortOrder: "asc" },
  });

  const optionMap = new Map(
    groups.flatMap((g) => g.options.map((o) => [o.id, { group: g, option: o }] as const)),
  );

  const selected: SelectedModifier[] = [];
  let unitExtra = 0;

  for (const id of optionIds) {
    const hit = optionMap.get(id);
    if (!hit) continue;
    const label = pickLocalizedName(hit.option, locale);
    unitExtra += hit.option.priceDelta;
    selected.push({
      groupId: hit.group.id,
      optionId: hit.option.id,
      label,
      priceDelta: hit.option.priceDelta,
    });
  }

  const summary = selected.length ? selected.map((s) => s.label).join(", ") : null;
  return { unitExtra, summary, selected };
}

export type ModifierGroupLike = {
  required: boolean;
  minSelect: number;
};

/** Majburiy variant bo'lsa — avval tanlash oynasi kerak */
export function mustPickModifiersBeforeAdd(
  groups: ModifierGroupLike[] | undefined,
): boolean {
  if (!groups?.length) return false;
  return groups.some((g) => g.required || g.minSelect > 0);
}

export function hasModifierGroups(groups: unknown[] | undefined): boolean {
  return (groups?.length ?? 0) > 0;
}

export function validateModifierSelection(
  groups: {
    id: string;
    required: boolean;
    minSelect: number;
    maxSelect: number;
    options: { id: string }[];
  }[],
  optionIds: string[],
): string | null {
  for (const group of groups) {
    const picked = optionIds.filter((id) => group.options.some((o) => o.id === id));
    if (group.required && picked.length === 0) {
      return `"${group.id}" guruhi uchun tanlov kerak`;
    }
    if (picked.length < group.minSelect && (group.required || group.minSelect > 0)) {
      return `Kamida ${group.minSelect} ta variant tanlang`;
    }
    if (picked.length > group.maxSelect) {
      return `Ko'pi bilan ${group.maxSelect} ta variant`;
    }
  }
  return null;
}

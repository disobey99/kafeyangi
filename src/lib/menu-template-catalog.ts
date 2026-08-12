import type { MenuFoodTagId } from "@/lib/menu-food-tags";

export type MenuTemplateItem = {
  id: string;
  menuTag: MenuFoodTagId;
  categoryHint: string;
  name: string;
  nameRu: string;
  nameEn: string;
  description: string;
  descriptionRu: string;
  descriptionEn: string;
  suggestedPriceSom: number;
  /** Premium placeholder vizual (emoji + gradient) */
  visualEmoji: string;
};

function item(
  id: string,
  menuTag: MenuFoodTagId,
  categoryHint: string,
  name: string,
  nameRu: string,
  nameEn: string,
  desc: string,
  price: number,
  emoji: string,
): MenuTemplateItem {
  return {
    id,
    menuTag,
    categoryHint,
    name,
    nameRu,
    nameEn,
    description: desc,
    descriptionRu: desc,
    descriptionEn: desc,
    suggestedPriceSom: price,
    visualEmoji: emoji,
  };
}

export const MENU_TEMPLATE_CATALOG: MenuTemplateItem[] = [
  // Milliy
  item("osh", "MILLIY", "Milliy taomlar", "Osh", "Плов", "Plov", "An'anaviy o'zbek oshi", 35000, "🍚"),
  item("manti", "MILLIY", "Milliy taomlar", "Manti", "Манты", "Manti", "Qo'y go'shtli manti", 28000, "🥟"),
  item("somsa", "MILLIY", "Milliy taomlar", "Somsa", "Самса", "Samsa", "Tandirda pishirilgan somsa", 12000, "🥟"),
  item("lagmon", "MILLIY", "Milliy taomlar", "Lag'mon", "Лагман", "Lagman", "Qo'lda cho'zilgan lag'mon", 32000, "🍜"),
  item("dimlama", "MILLIY", "Milliy taomlar", "Dimlama", "Димлама", "Dimlama", "Go'sht va sabzavotli dimlama", 38000, "🍲"),
  item("norin", "MILLIY", "Milliy taomlar", "Norin", "Норин", "Norin", "Atrof-muhit taomi norin", 30000, "🍝"),
  item("chuchvara", "MILLIY", "Milliy taomlar", "Chuchvara", "Чучвара", "Chuchvara", "Suvda qaynatilgan chuchvara", 25000, "🥟"),
  item("qozon-kabob", "MILLIY", "Milliy taomlar", "Qozon kabob", "Казан-кебаб", "Kazan kebab", "Qozonda pishirilgan go'sht", 42000, "🥘"),

  // Go'shtli
  item("jiz", "GOSHTLI", "Go'shtli taomlar", "Jiz", "Жиз", "Jiz", "Qovurilgan go'sht bo'laklari", 45000, "🥩"),
  item("tabaka", "GOSHTLI", "Go'shtli taomlar", "Tabaka", "Табака", "Tabaka", "Tovuq tabaka", 40000, "🍗"),
  item("bifshteks", "GOSHTLI", "Go'shtli taomlar", "Bifshteks", "Бифштекс", "Beefsteak", "Mol go'shti bifshteks", 55000, "🥩"),
  item("kotlet", "GOSHTLI", "Go'shtli taomlar", "Kotlet", "Котлета", "Cutlet", "Xam kotlet garnir bilan", 32000, "🍖"),
  item("gulyash", "GOSHTLI", "Go'shtli taomlar", "Gulyash", "Гуляш", "Goulash", "Go'sht gulyash", 36000, "🍖"),
  item("qiyma-kabob", "GOSHTLI", "Go'shtli taomlar", "Qiyma kabob", "Кебаб", "Minced kebab", "Qiyma kabob", 38000, "🥩"),

  // Suyuq
  item("shorva", "SUYUQ", "Sho'rvalar", "Mol go'shtli sho'rva", "Шурпа", "Beef soup", "An'anaviy sho'rva", 28000, "🍲"),
  item("mastava", "SUYUQ", "Sho'rvalar", "Mastava", "Мастава", "Mastava", "Guruchli mastava", 25000, "🍲"),
  item("soup-cream", "SUYUQ", "Sho'rvalar", "Krem sup", "Крем-суп", "Cream soup", "Sabzavotli krem sup", 22000, "🥣"),
  item("borsh", "SUYUQ", "Sho'rvalar", "Borsh", "Борщ", "Borscht", "Klassik borsh", 24000, "🍲"),
  item("soup-chicken", "SUYUQ", "Sho'rvalar", "Tovuq sho'rvasi", "Куриный суп", "Chicken soup", "Tovuq suyagi sho'rvasi", 26000, "🍜"),
  item("mashhurda", "SUYUQ", "Sho'rvalar", "Mashhurda", "Машхурда", "Mashkhurda", "Mash va go'sht sho'rvasi", 27000, "🍲"),

  // Kabob
  item("kabab", "KABOB", "Kabob", "Qo'y kabob", "Шашлык", "Lamb kebab", "Tandir kabob", 40000, "🔥"),
  item("jigar", "KABOB", "Kabob", "Jigar kabob", "Жигар", "Liver kebab", "Qo'y jigar kabob", 30000, "🔥"),
  item("grill-set", "KABOB", "Kabob", "Grill to'plami", "Гриль сет", "Grill set", "Aralash grill to'plami", 85000, "🍖"),
  item("tovuq-kabob", "KABOB", "Kabob", "Tovuq kabob", "Куриный шашлык", "Chicken kebab", "Marinadlangan tovuq", 32000, "🍗"),
  item("ribeye", "KABOB", "Kabob", "Antrekot", "Антрекот", "Ribeye", "Grilda antrekot", 75000, "🥩"),

  // Salat
  item("achik-chuchuk", "SALAT", "Salatlar", "Achik-chuchuk", "Ачик-чучук", "Achichuk", "Pomidor piyoz salat", 12000, "🥗"),
  item("sezar", "SALAT", "Salatlar", "Sezar salat", "Цезарь", "Caesar", "Tovuqli sezar", 35000, "🥗"),
  item("greek", "SALAT", "Salatlar", "Grek salat", "Греческий", "Greek salad", "Feta bilan grek salat", 28000, "🥗"),
  item("olivye", "SALAT", "Salatlar", "Olivye", "Оливье", "Olivier", "Klassik olivye", 22000, "🥗"),
  item("suzma", "SALAT", "Salatlar", "Suzma salat", "Сузма", "Suzma salad", "Suzma va ko'katlar", 18000, "🥗"),

  // Ichimlik
  item("choy", "ICHIMLIK", "Ichimliklar", "Ko'k choy", "Зелёный чай", "Green tea", "Qaynoq ko'k choy", 8000, "🍵"),
  item("kompot", "ICHIMLIK", "Ichimliklar", "Kompot", "Компот", "Kompot", "Uy kompoti", 10000, "🥤"),
  item("ayran", "ICHIMLIK", "Ichimliklar", "Ayran", "Айран", "Ayran", "Sovuq ayran", 12000, "🥛"),
  item("cola", "ICHIMLIK", "Ichimliklar", "Cola 0.5", "Кола 0.5", "Cola 0.5", "Sovuq gazlangan ichimlik", 12000, "🥤"),
  item("coffee", "ICHIMLIK", "Ichimliklar", "Amerikano", "Американо", "Americano", "Qahva amerikano", 18000, "☕"),
  item("smuzi", "ICHIMLIK", "Ichimliklar", "Smuzi", "Смузи", "Smoothie", "Meva smuzi", 22000, "🧃"),
  item("limonad", "ICHIMLIK", "Ichimliklar", "Limonad", "Лимонад", "Lemonade", "Uy limonadi", 15000, "🍋"),

  // Desert
  item("medovik", "DESERT", "Shirinliklar", "Medovik", "Медовик", "Honey cake", "Asal torti medovik", 20000, "🍰"),
  item("tiramisu", "DESERT", "Shirinliklar", "Tiramisu", "Тирамису", "Tiramisu", "Italiya shirinligi", 25000, "🍰"),
  item("halva", "DESERT", "Shirinliklar", "Halvo", "Халва", "Halva", "An'anaviy halvo", 15000, "🍬"),
  item("ice-cream", "DESERT", "Shirinliklar", "Muzqaymoq", "Мороженое", "Ice cream", "3 sharh muzqaymoq", 12000, "🍨"),
  item("chak-chak", "DESERT", "Shirinliklar", "Chak-chak", "Чак-чак", "Chak-chak", "Asal chak-chak", 18000, "🍯"),

  // Fast food
  item("burger", "FAST_FOOD", "Fast food", "Klassik burger", "Бургер", "Classic burger", "Mol go'shti burger", 35000, "🍔"),
  item("cheeseburger", "FAST_FOOD", "Fast food", "Chizburger", "Чизбургер", "Cheeseburger", "Pishloqli burger", 38000, "🍔"),
  item("lavash", "FAST_FOOD", "Fast food", "Tovuq lavash", "Лаваш", "Chicken lavash", "Tovuqli lavash", 28000, "🌯"),
  item("hot-dog", "FAST_FOOD", "Fast food", "Hot-dog", "Хот-дог", "Hot dog", "Klassik hot-dog", 22000, "🌭"),
  item("pizza", "FAST_FOOD", "Fast food", "Pepperoni pizza", "Пепперони", "Pepperoni pizza", "30 sm pizza", 65000, "🍕"),
  item("fries", "FAST_FOOD", "Fast food", "Kartoshka fri", "Фри", "French fries", "Xrustkach kartoshka fri", 15000, "🍟"),
  item("nuggets", "FAST_FOOD", "Fast food", "Naggets", "Наггетсы", "Nuggets", "Tovuq naggets 6 dona", 25000, "🍗"),
];

export function getMenuTemplateById(id: string): MenuTemplateItem | undefined {
  return MENU_TEMPLATE_CATALOG.find((t) => t.id === id);
}

export function listMenuTemplates(tag?: MenuFoodTagId, query?: string): MenuTemplateItem[] {
  const q = query?.trim().toLowerCase() ?? "";
  return MENU_TEMPLATE_CATALOG.filter((t) => {
    if (tag && t.menuTag !== tag) return false;
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.nameRu.toLowerCase().includes(q) ||
      t.nameEn.toLowerCase().includes(q) ||
      t.categoryHint.toLowerCase().includes(q)
    );
  });
}

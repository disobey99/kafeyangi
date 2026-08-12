import {
  getPlanConfig,
  PLAN_FEATURE_LABELS,
  type PlanFeatures,
  type PlanId,
} from "@/lib/plans";

export type PlanFeatureMarketing = {
  feature: keyof PlanFeatures;
  title: string;
  hook: string;
  benefits: string[];
  scenario: string;
  minPlan: "STANDARD" | "PRO";
};

const COPY: Partial<Record<keyof PlanFeatures, Omit<PlanFeatureMarketing, "feature" | "minPlan">>> = {
  onlineOrders: {
    title: "Onlayn buyurtma va yetkazib berish",
    hook: "Mijozlar telefonidan buyurtma bersin — siz faqat tayyorlab yuborasiz.",
    benefits: [
      "Android ilova: menyu, savat, to'lov va yetkazish bir joyda",
      "Olib ketish va yetkazib berish rejimlari",
      "Yangi buyurtmalar real vaqtda kassa / oshxonaga tushadi",
    ],
    scenario:
      "Kechqurun zal to'la bo'lsa ham, ilova orqali kelgan buyurtmalar qo'shimcha savdo oqimini ochadi.",
  },
  reports: {
    title: "Savdo hisobotlari",
    hook: "Kunlik tushumni taxmin qilmang — raqamlarni aniq ko'ring.",
    benefits: [
      "Kunlik / haftalik savdo grafigi",
      "Eng ko'p sotilgan taomlar",
      "Qaysi smena yaxshiroq ishlayotganini bilasiz",
    ],
    scenario:
      "Hafta oxirida qaysi taomlar 'o'lik' ekanini bilib, menyuni tezkor tozalaysiz.",
  },
  dailySalesAnalysis: {
    title: "Kunlik savdo tahlili",
    hook: "Har kuni qayerda o'sish, qayerda tushish bor — bir qarashda.",
    benefits: [
      "Kunlik dinamika",
      "Taqqoslash: kecha vs bugun",
      "Tez qaror uchun qisqa insightlar",
    ],
    scenario: "Ertalab ochib, kechagi tushumni 30 soniyada tahlil qilasiz.",
  },
  abcAnalysis: {
    title: "ABC mahsulot tahlili",
    hook: "Qaysi 20% taom 80% foyda keltiryapti — aniq ro'yxat.",
    benefits: [
      "A / B / C guruhlash",
      "Zaxira va marketingni to'g'ri yo'naltirish",
      "Past marjali pozitsiyalarni aniqlash",
    ],
    scenario: "Ombor buyurtmasini ABC bo'yicha qilib, ortiqcha zaxiradan qutilasiz.",
  },
  floorPlan: {
    title: "Vizual zal sxemasi",
    hook: "Stollarni xarita kabi ko'ring — band / bo'sh bir zumda.",
    benefits: [
      "Zalni drag-and-drop bilan joylashtirish",
      "Ofitsiant va kassa bir xil ko'rinishda ishlaydi",
      "Mijoz kutishini kamaytiradi",
    ],
    scenario: "Peak soatda bo'sh stolni 2 soniyada topasiz — navbat qisqaradi.",
  },
  promos: {
    title: "Aksiyalar va chegirmalar",
    hook: "Happy hour, foizli chegirma, '2+1' — mijozni qaytarib chaqiring.",
    benefits: [
      "Vaqtli aksiyalar",
      "Mahsulotga chegirma",
      "Ilova va menyuda avtomatik ko'rinadi",
    ],
    scenario: "Chorshanba kechki soatlarda soft chegirma bilan zalni to'ldirasiz.",
  },
  telegram: {
    title: "Telegram kunlik hisobot",
    hook: "Har kuni tushum avtomatik Telegramingizga keladi.",
    benefits: [
      "Kunlik qisqa hisobot",
      "Uydan ham nazorat",
      "Muhim ogohlantirishlar",
    ],
    scenario: "Ertalab uyg'onib, kechagi savdoni chatdan o'qiysiz.",
  },
  inventoryRation: {
    title: "Ombor va ratsiya nazorati",
    hook: "Har bir taom retsepti bo'yicha zaxira avtomatik kamayadi.",
    benefits: [
      "Kirim / chiqim / transfer",
      "Kam zaxira ogohlantirishi",
      "O'g'rilik va isrofgarchilikni kamaytiradi",
    ],
    scenario: "Oy oxirida 'nima yo'qoldi?' savoli o'rniga aniq hisobot bo'ladi.",
  },
  freezerMonitoring: {
    title: "Muzlatgich IoT nazorati",
    hook: "Harorat chiqsa — darhol bilasiz, mahsulot saqlanadi.",
    benefits: [
      "Real vaqt harorat",
      "Ogohlantirishlar",
      "Sifat va xavfsizlik",
    ],
    scenario: "Tunagi elektr uzilishida ertalab zarar ko'rmasdan chorasini ko'rasiz.",
  },
  operationsHub: {
    title: "Operations Hub",
    hook: "Smena, chat, IoT va operatsiyalar — bitta markaz.",
    benefits: [
      "Smena boshqaruvi",
      "Jamoa ichki aloqasi",
      "Tezkor operatsion panel",
    ],
    scenario: "Filial menejeri kunni bitta ekrandan boshqaradi.",
  },
  multiBranch: {
    title: "Ko'p filial boshqaruvi",
    hook: "Bitta kabinetdan barcha filiallar — menyu, xodim, hisobot.",
    benefits: [
      "Filiallararo switch",
      "Yagona brend nazorati",
      "Tarmoq o'sishi uchun tayyor infratuzilma",
    ],
    scenario: "Ikkinchi filial ochganda yangi tizim qurmasdan, shu yerdan qo'shasiz.",
  },
  staffEfficiency: {
    title: "Xodim samaradorligi",
    hook: "Kim qancha buyurtma / chaqiriq yopganini ko'ring.",
    benefits: [
      "Ofitsiant statistikasi",
      "Adolatli bonus asosi",
      "Zaif nuqtalarni topish",
    ],
    scenario: "Eng yaxshi ofitsiantni raqam bilan taqdirlab, jamoani rag'batlantirasiz.",
  },
  customDashboardTheme: {
    title: "Dashboard rang temasi",
    hook: "Panelni brendingizga moslab bezating.",
    benefits: ["Maxsus ranglar", "Jamoa uchun qulay ko'rinish"],
    scenario: "Xodimlar o'zlariga qulay temada tezroq ishlaydi.",
  },
  customDomain: {
    title: "O'z domen / subdomain",
    hook: "nomingiz.kafenomi.uz — brendingiz ostida professional manzil.",
    benefits: ["Subdomain", "Brend ishonchi", "Marketing uchun qulay havola"],
    scenario: "Instagram bio'da chiroyli havola — mijoz ishonchi oshadi.",
  },
  waiterCall: {
    title: "Ofitsiant chaqirish (QR)",
    hook: "Mijoz QR orqali ofitsiantni chaqiradi — zal tinchroq.",
    benefits: ["QR chaqiriq", "Tezroq xizmat", "Kamroq yugurish"],
    scenario: "Mijoz qo'l siltamasdan, telefonidan chaqiradi.",
  },
};

export function minPlanForFeature(feature: keyof PlanFeatures): "STANDARD" | "PRO" {
  if (getPlanConfig("STANDARD").features[feature]) return "STANDARD";
  return "PRO";
}

export function getPlanFeatureMarketing(
  feature: keyof PlanFeatures,
): PlanFeatureMarketing {
  const base = COPY[feature];
  const minPlan = minPlanForFeature(feature);
  if (base) {
    return { feature, minPlan, ...base };
  }
  return {
    feature,
    minPlan,
    title: PLAN_FEATURE_LABELS[feature],
    hook: "Bu imkoniyat joriy tarifingizda yopiq.",
    benefits: ["Yuqori tarifda ochiladi", "Ko'proq avtomatizatsiya", "Kuchliroq nazorat"],
    scenario: "Tarifni yangilab, shu funksiyani bir zumda ishga tushirasiz.",
  };
}

/** Floating tip uchun eng kuchli marketing oqimi */
export const UPSELL_ROTATION: (keyof PlanFeatures)[] = [
  "onlineOrders",
  "multiBranch",
  "inventoryRation",
  "floorPlan",
  "reports",
  "promos",
  "operationsHub",
  "staffEfficiency",
  "abcAnalysis",
  "telegram",
];

export function planNameForMin(minPlan: "STANDARD" | "PRO"): string {
  return minPlan === "PRO" ? "Pro" : "Standard";
}

export function featuresLockedForPlan(
  features: PlanFeatures,
  candidates: (keyof PlanFeatures)[] = UPSELL_ROTATION,
): (keyof PlanFeatures)[] {
  return candidates.filter((f) => !features[f]);
}

export type { PlanId };

import { prisma } from "@/lib/prisma";
import { getConfiguredAppUrl, PRODUCTION_APP_URL } from "@/lib/app-url";
import {
  getTelegramBotUsername,
  getTelegramWebAppUrl,
  sendTelegramMessage as sendTelegramMessageRaw,
  type TelegramInlineButton,
} from "@/lib/telegram";
import { getPlanConfig, type PlanId } from "@/lib/plans";

function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: { inlineKeyboard?: TelegramInlineButton[][] },
) {
  return sendTelegramMessageRaw(chatId, text, { ...options, bot: "customer" });
}

function appBaseUrl() {
  return getConfiguredAppUrl() || PRODUCTION_APP_URL;
}

/** Mijoz ilova havolasi — Telegram tugmasi uchun absolute URL */
export function getCustomerPwaUrl(slug: string): string {
  const base = appBaseUrl();
  if (base.startsWith("https://") || base.startsWith("http://")) {
    return `${base}/c/${slug}/app`;
  }
  return "";
}

/** Deep-link: t.me/Bot?start=cafe_slug */
export async function getCafeBotStartLink(slug: string): Promise<string | null> {
  const bot = await getTelegramBotUsername("customer");
  if (!bot) return null;
  return `https://t.me/${bot}?start=cafe_${slug}`;
}

function cafeCustomerKeyboard(slug: string): TelegramInlineButton[][] {
  const webApp = getTelegramWebAppUrl(slug);
  const pwa = getCustomerPwaUrl(slug);
  const rows: TelegramInlineButton[][] = [];
  if (webApp) {
    rows.push([{ text: "🛒 Buyurtma berish", web_app: { url: webApp } }]);
  }
  if (pwa) {
    rows.push([{ text: "📱 Ilovani yuklab olish (APK)", url: pwa }]);
  }
  rows.push([{ text: "🔄 Boshqa kafe", callback_data: "cust_cafes" }]);
  return rows;
}

function customerHomeKeyboard(): TelegramInlineButton[][] {
  return [
    [{ text: "🔍 Kafelarni ko‘rish", callback_data: "cust_cafes" }],
    [{ text: "ℹ️ Qanday buyurtma beriladi?", callback_data: "cust_about" }],
  ];
}

async function findPublicCafeBySlug(slug: string) {
  const cafe = await prisma.cafe.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      status: true,
      plan: true,
      telegramBotEnabled: true,
    },
  });
  if (!cafe) return null;
  if (cafe.status === "SUSPENDED" || cafe.status === "CANCELLED") return null;
  if (!cafe.telegramBotEnabled) return null;
  const features = getPlanConfig(cafe.plan as PlanId).features;
  if (!features.telegram || !features.onlineOrders) return null;
  return cafe;
}

/** /start cafe_{slug} — mijozni shu kafega bog'lash */
export async function sendCustomerCafeWelcome(
  chatId: string,
  slugRaw: string,
): Promise<boolean> {
  const slug = slugRaw.trim().toLowerCase().replace(/^cafe_/, "");
  if (!slug) return false;

  const cafe = await findPublicCafeBySlug(slug);
  if (!cafe) {
    await sendTelegramMessage(
      chatId,
      [
        "❌ Bu kafe topilmadi yoki Telegram buyurtma ochiq emas.",
        "",
        "Kafe saytidagi bot havolasini oching yoki pastdan kafeni tanlang.",
      ].join("\n"),
      {
        inlineKeyboard: [
          [{ text: "🔍 Kafelarni ko‘rish", callback_data: "cust_cafes" }],
        ],
      },
    );
    return true;
  }

  const lines = [
    `🏪 <b>${cafe.name}</b>`,
    cafe.address ? `📍 ${cafe.address}` : "",
    "",
    "Buyurtma — Telegram ichida (Web App), xuddi ilovadagi kabi.",
    "Ilovani telefoningizga o‘rnatish uchun APK yuklab oling.",
    "",
    "Bir xil telefon bilan kirsangiz, buyurtmalar ilova va botda bir xil ko‘rinadi.",
  ].filter(Boolean);

  await sendTelegramMessage(chatId, lines.join("\n"), {
    inlineKeyboard: cafeCustomerKeyboard(cafe.slug),
  });
  return true;
}

/** Botni qidirib Start — faqat mijoz buyurtma oqimi */
export async function sendCustomerBareStart(chatId: string) {
  const support = process.env.TELEGRAM_SUPPORT_BOT_USERNAME?.replace(
    /^@/,
    "",
  ).trim();
  await sendTelegramMessage(
    chatId,
    [
      "🛒 <b>NOOKLINE</b> — mijoz buyurtma boti",
      "",
      "Bu yerda kafedan online buyurtma beriladi.",
      "Kafe tanlang yoki kafe saytidagi «Telegramda buyurtma» tugmasini bosing.",
      support
        ? `\nBiznes / kafe egasi uchun: @${support}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    { inlineKeyboard: customerHomeKeyboard() },
  );
}

export async function sendCustomerAbout(chatId: string) {
  await sendTelegramMessage(
    chatId,
    [
      "<b>Qanday buyurtma beriladi?</b>",
      "",
      "1) Kafeni tanlang yoki saytdagi bot havolasini oching",
      "2) «Buyurtma berish» — Telegram ichida menyu ochiladi",
      "3) Yoki «Ilovani yuklab olish» — Android APK",
      "",
      "Telefon bilan login qilsangiz, buyurtmalar bot va ilovada bir xil.",
    ].join("\n"),
    { inlineKeyboard: customerHomeKeyboard() },
  );
}

/** Matn yozganda mijozga — support matnsiz */
export async function sendCustomerTextHint(chatId: string) {
  await sendTelegramMessage(
    chatId,
    "Buyurtma uchun pastdagi tugmalardan foydalaning — chat orqali buyurtma qabul qilinmaydi.",
    { inlineKeyboard: customerHomeKeyboard() },
  );
}

/** Faol kafelar ro'yxati (Telegram buyurtma ochiq) */
export async function sendCustomerCafePicker(chatId: string) {
  const cafes = await prisma.cafe.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIAL"] },
      plan: { in: ["STANDARD", "PRO"] },
      telegramBotEnabled: true,
    },
    select: { name: true, slug: true, address: true },
    orderBy: { name: "asc" },
    take: 20,
  });

  const eligible = cafes.filter((c) => Boolean(c.slug));

  if (eligible.length === 0) {
    await sendTelegramMessage(
      chatId,
      "Hozircha bot orqali buyurtma ochiq kafe yo‘q. Keyinroq urinib ko‘ring.",
    );
    return;
  }

  const buttons: TelegramInlineButton[][] = eligible.map((c) => [
    {
      text: c.name.slice(0, 40),
      callback_data: `cust_cafe:${c.slug}`.slice(0, 64),
    },
  ]);

  await sendTelegramMessage(chatId, "Qaysi kafedan buyurtma berasiz?", {
    inlineKeyboard: buttons,
  });
}

export async function handleCustomerCallback(
  chatId: string,
  data: string,
): Promise<boolean> {
  if (data === "cust_cafes") {
    await sendCustomerCafePicker(chatId);
    return true;
  }
  if (data === "cust_about") {
    await sendCustomerAbout(chatId);
    return true;
  }
  if (data === "cust_home") {
    await sendCustomerBareStart(chatId);
    return true;
  }
  if (data.startsWith("cust_cafe:")) {
    const slug = data.slice("cust_cafe:".length);
    await sendCustomerCafeWelcome(chatId, slug);
    return true;
  }
  return false;
}

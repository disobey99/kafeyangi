import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getConfiguredAppUrl, PRODUCTION_APP_URL } from "@/lib/app-url";
import { getPlanConfig, type PlanId } from "@/lib/plans";
import { formatDailyReportMessage } from "@/lib/daily-report";
import { getReports } from "@/lib/reports";
import {
  formatBranchesMessage,
  formatCustomReportMessage,
  formatStaffChatPreview,
  formatStaffDutyMessage,
  formatTodaySalesMessage,
  listOwnerCafes,
  parseReportDateRange,
  postOwnerStaffChatMessage,
  type OwnerCafe,
} from "@/lib/telegram-owner-ops";
import {
  getTelegramBotToken,
  getTelegramBotUsername,
  hasSeparateSupportBot,
  sendTelegramMessage as sendTelegramMessageRaw,
  type TelegramInlineButton,
} from "@/lib/telegram";

const LINK_TTL_MS = 30 * 60 * 1000;

/** Support bot orqali yuborish — delivery botga chalkashmasin */
function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: { inlineKeyboard?: TelegramInlineButton[][] },
) {
  return sendTelegramMessageRaw(chatId, text, { ...options, bot: "support" });
}

export type BotSessionMode = "menu" | "report_range" | "staff_chat";

type SessionRow = {
  chatId: string;
  userId: string | null;
  cafeId: string | null;
  mode: string;
};

export async function ensureTelegramSupportTables() {
  // Postgres: quoted identifiers + TIMESTAMP (SQLite DATETIME emas)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TelegramBotSession" (
      "chatId" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT,
      "cafeId" TEXT,
      "mode" TEXT NOT NULL DEFAULT 'menu',
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TelegramOwnerLink" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "expiresAt" TIMESTAMP NOT NULL,
      "usedAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getSession(chatId: string): Promise<SessionRow | null> {
  await ensureTelegramSupportTables();
  const rows = await prisma.$queryRaw<SessionRow[]>`
    SELECT "chatId", "userId", "cafeId", "mode"
    FROM "TelegramBotSession"
    WHERE "chatId" = ${chatId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function setSession(input: {
  chatId: string;
  userId?: string | null;
  cafeId?: string | null;
  mode: BotSessionMode;
}) {
  await ensureTelegramSupportTables();
  const existing = await getSession(input.chatId);
  const userId = input.userId !== undefined ? input.userId : existing?.userId ?? null;
  const cafeId = input.cafeId !== undefined ? input.cafeId : existing?.cafeId ?? null;
  if (existing) {
    await prisma.$executeRaw`
      UPDATE "TelegramBotSession"
      SET "userId" = ${userId},
          "cafeId" = ${cafeId},
          "mode" = ${input.mode},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "chatId" = ${input.chatId}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO "TelegramBotSession" ("chatId", "userId", "cafeId", "mode", "updatedAt")
      VALUES (${input.chatId}, ${userId}, ${cafeId}, ${input.mode}, CURRENT_TIMESTAMP)
    `;
  }
}

function siteUrl() {
  return getConfiguredAppUrl() || PRODUCTION_APP_URL;
}

type OwnerContext = {
  user: { id: string; name: string; email: string; telegramChatId: string | null };
  cafes: OwnerCafe[];
  cafe: OwnerCafe | null;
};

export async function findOwnerByChatId(chatId: string): Promise<OwnerContext | null> {
  const user = await prisma.user.findFirst({
    where: { telegramChatId: chatId },
    select: { id: true, name: true, email: true, telegramChatId: true },
  });
  if (!user) return null;

  const cafes = await listOwnerCafes(user.id);
  const session = await getSession(chatId);
  const cafe =
    (session?.cafeId && cafes.find((c) => c.id === session.cafeId)) ||
    cafes[0] ||
    null;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      telegramChatId: user.telegramChatId,
    },
    cafes,
    cafe,
  };
}

export async function createOwnerTelegramLink(userId: string) {
  try {
    await ensureTelegramSupportTables();
    if (!hasSeparateSupportBot()) {
      return {
        ok: false as const,
        error:
          "Egasi boti sozlanmagan: .env da TELEGRAM_SUPPORT_BOT_TOKEN (@nooklineSupportbot) kerak. Delivery botga ulanmaydi.",
        status: 503,
      };
    }
    const bot = await getTelegramBotUsername("support");
    if (!bot || !getTelegramBotToken("support")) {
      return {
        ok: false as const,
        error:
          "Support Telegram bot sozlanmagan (TELEGRAM_SUPPORT_BOT_TOKEN / TELEGRAM_SUPPORT_BOT_USERNAME)",
        status: 503,
      };
    }
    const id = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + LINK_TTL_MS);
    await prisma.$executeRaw`
      INSERT INTO "TelegramOwnerLink" ("id", "userId", "expiresAt", "createdAt")
      VALUES (${id}, ${userId}, ${expiresAt}, CURRENT_TIMESTAMP)
    `;
    return {
      ok: true as const,
      telegramUrl: `https://t.me/${bot}?start=link_${id}`,
      expiresAt,
    };
  } catch (e) {
    console.error("[createOwnerTelegramLink]", e);
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Havola yaratilmadi",
      status: 500,
    };
  }
}

export async function fulfillOwnerTelegramLink(linkId: string, chatId: string) {
  await ensureTelegramSupportTables();
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      userId: string;
      expiresAt: string | Date;
      usedAt: string | Date | null;
    }>
  >`
    SELECT "id", "userId", "expiresAt", "usedAt"
    FROM "TelegramOwnerLink"
    WHERE "id" = ${linkId}
    LIMIT 1
  `;
  const link = rows[0];
  if (!link) {
    await sendTelegramMessage(
      chatId,
      "Havola topilmadi. Dashboarddan qayta «Profilni ulash» ni bosing.",
    );
    return { ok: false as const };
  }
  if (link.usedAt) {
    await sendTelegramMessage(chatId, "Bu havola allaqachon ishlatilgan.");
    return { ok: false as const };
  }
  if (new Date(link.expiresAt).getTime() < Date.now()) {
    await sendTelegramMessage(chatId, "Havola muddati tugagan (30 daqiqa). Qayta so'rang.");
    return { ok: false as const };
  }

  const user = await prisma.user.findUnique({
    where: { id: link.userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    await sendTelegramMessage(chatId, "Foydalanuvchi topilmadi.");
    return { ok: false as const };
  }

  await prisma.user.updateMany({
    where: { telegramChatId: chatId, NOT: { id: link.userId } },
    data: { telegramChatId: null },
  });
  await prisma.user.update({
    where: { id: link.userId },
    data: { telegramChatId: chatId },
  });
  const usedAt = new Date();
  await prisma.$executeRaw`
    UPDATE "TelegramOwnerLink" SET "usedAt" = ${usedAt} WHERE "id" = ${link.id}
  `;

  const cafes = await listOwnerCafes(link.userId);
  const cafe = cafes[0] ?? null;

  // Kunlik hisobotlar Cafe.telegramChatId dan o‘qiydi
  if (cafes.length > 0) {
    await prisma.cafe.updateMany({
      where: { ownerId: link.userId },
      data: { telegramChatId: chatId },
    });
  }

  await setSession({
    chatId,
    userId: link.userId,
    cafeId: cafe?.id ?? null,
    mode: "menu",
  });

  await sendTelegramMessage(
    chatId,
    [
      "✅ <b>Profil ulandi</b>",
      `👤 ${user.name}`,
      `✉️ ${user.email}`,
      cafe ? `🏪 ${cafe.name}` : "🏪 Kafe hali bog'lanmagan",
      "",
      "Bu botda: bugungi savdo, xodimlar, hisobot, filiallar va ichki xodim chati.",
      "Platforma Support (sayt) alohida — bu yerga aralashmaydi.",
    ].join("\n"),
    { inlineKeyboard: ownerMenuKeyboard(cafes.length > 1) },
  );
  return { ok: true as const };
}

export function ownerMenuKeyboard(hasBranches = false): TelegramInlineButton[][] {
  const rows: TelegramInlineButton[][] = [
    [{ text: "📊 Bugungi savdo", callback_data: "owner_sales_today" }],
    [{ text: "👥 Bugun ishdagilar", callback_data: "owner_staff_duty" }],
    [{ text: "📈 Savdo hisoboti", callback_data: "owner_report_range" }],
  ];
  if (hasBranches) {
    rows.push([{ text: "🏪 Filiallar", callback_data: "owner_branches" }]);
  }
  rows.push(
    [{ text: "💬 Xodim bilan bog‘lanish", callback_data: "owner_staff_chat" }],
    [{ text: "📋 Joriy tarif", callback_data: "owner_plan" }],
    [{ text: "🏠 Menyuga", callback_data: "owner_menu" }],
  );
  return rows;
}

export function guestMenuKeyboard(): TelegramInlineButton[][] {
  const url = siteUrl();
  return [
    [{ text: "🌐 Asosiy sayt", url }],
    [{ text: "ℹ️ Tizim haqida", callback_data: "guest_about" }],
  ];
}

function ownerKb(ctx: OwnerContext) {
  return ownerMenuKeyboard(ctx.cafes.length > 1);
}

export async function formatOwnerPlanMessage(cafeId: string) {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: {
      name: true,
      plan: true,
      status: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
    },
  });
  if (!cafe) return "Kafe topilmadi.";
  const plan = getPlanConfig(cafe.plan as PlanId);
  const rawEnd =
    cafe.status === "TRIAL" ? cafe.trialEndsAt : cafe.subscriptionEndsAt;
  const end = rawEnd ? new Date(rawEnd) : null;
  const endLabel =
    end && !Number.isNaN(end.getTime())
      ? end.toLocaleDateString("uz-UZ", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "—";
  const daysLeft =
    end && !Number.isNaN(end.getTime())
      ? Math.ceil((end.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      : null;

  const lines = [
    `📋 <b>Joriy tarif</b>`,
    `🏪 ${cafe.name}`,
    `📦 ${plan.name}`,
    `📊 Holat: ${cafe.status}`,
    `📅 Tugash: ${endLabel}`,
  ];
  if (daysLeft != null) {
    lines.push(
      daysLeft <= 0
        ? `⚠️ Muddat tugagan yoki tugash arafasida`
        : `⏳ Qolgan kun: <b>${daysLeft}</b>`,
    );
  }
  return lines.join("\n");
}

function guestWelcomeText() {
  const url = siteUrl();
  return [
    `<b>NOOKLINE</b> — kafe avtomatlashtirish platformasi`,
    "",
    "Kafe va restoran ishini bitta tizimda boshqarish uchun:",
    "zal, oshxona, kuryer, online buyurtma, hisobot va xodimlar.",
    "",
    "Vazifasi — qog‘oz/chaqoq jarayonlarni kamaytirib, buyurtma va savdoni avtomatlashtirish.",
    "",
    `🌐 Batafsil va ro‘yxatdan o‘tish: ${url}`,
    "",
    "Kafe egasisizmi? Saytdagi Dashboarddan «Telegram profilni ulash».",
    "Parol unutilgan bo‘lsa — saytda email orqali kod oling.",
  ].join("\n");
}

export async function sendWelcome(chatId: string) {
  const linked = await findOwnerByChatId(chatId);
  if (linked?.cafe) {
    await setSession({
      chatId,
      userId: linked.user.id,
      cafeId: linked.cafe.id,
      mode: "menu",
    });
    const customer = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "").trim();
    const extraRows: TelegramInlineButton[][] =
      hasSeparateSupportBot() && customer
        ? [[{ text: "🛒 Mijoz buyurtmasi", url: `https://t.me/${customer}` }]]
        : [];
    await sendTelegramMessage(
      chatId,
      [
        `🛠 <b>NOOKLINE — kafe egasi</b>`,
        `Xush kelibsiz, ${linked.user.name}!`,
        `🏪 ${linked.cafe.name}`,
        linked.cafes.length > 1
          ? `Filiallar: ${linked.cafes.length} ta`
          : "",
        "",
        "Bugungi savdo, xodimlar, hisobot va ichki chat — pastdagi menyuda.",
      ]
        .filter(Boolean)
        .join("\n"),
      {
        inlineKeyboard: [...ownerKb(linked), ...extraRows],
      },
    );
    return;
  }

  if (linked?.user && !linked.cafe) {
    await setSession({
      chatId,
      userId: linked.user.id,
      cafeId: null,
      mode: "menu",
    });
    await sendTelegramMessage(
      chatId,
      [
        `🛠 <b>NOOKLINE</b>`,
        `Profilingiz ulangan (${linked.user.name}), lekin kafe topilmadi.`,
        "Dashboardda kafe yaratilganini tekshiring.",
      ].join("\n"),
      { inlineKeyboard: guestMenuKeyboard() },
    );
    return;
  }

  await setSession({ chatId, mode: "menu", userId: null, cafeId: null });
  await sendTelegramMessage(chatId, guestWelcomeText(), {
    inlineKeyboard: guestMenuKeyboard(),
  });
}

function branchKeyboard(cafes: OwnerCafe[], activeId: string): TelegramInlineButton[][] {
  const rows: TelegramInlineButton[][] = cafes.map((c) => [
    {
      text: `${c.id === activeId ? "✅ " : ""}${c.name}${c.isMainBranch ? " ★" : ""}`,
      callback_data: `owner_branch:${c.id}`,
    },
  ]);
  rows.push([{ text: "🏠 Menyuga", callback_data: "owner_menu" }]);
  return rows;
}

export async function handleOwnerCallback(chatId: string, data: string) {
  try {
    if (data === "guest_about") {
      await sendTelegramMessage(chatId, guestWelcomeText(), {
        inlineKeyboard: guestMenuKeyboard(),
      });
      return;
    }

    const linked = await findOwnerByChatId(chatId);
    if (!linked?.cafe && data.startsWith("owner_")) {
      await sendTelegramMessage(
        chatId,
        linked?.user
          ? "Profilingiz ulangan, lekin kafe topilmadi. Dashboardda kafe borligini tekshiring."
          : "Avval profilni ulang: Dashboard → Sozlamalar → Telegram profilni ulash.",
        { inlineKeyboard: guestMenuKeyboard() },
      );
      return;
    }

    if (!linked?.cafe) return;
    const cafe = linked.cafe;

    if (data === "owner_menu") {
      await setSession({
        chatId,
        userId: linked.user.id,
        cafeId: cafe.id,
        mode: "menu",
      });
      await sendTelegramMessage(chatId, "Asosiy menyu:", {
        inlineKeyboard: ownerKb(linked),
      });
      return;
    }

    if (data === "owner_plan") {
      const text = await formatOwnerPlanMessage(cafe.id);
      await sendTelegramMessage(chatId, text, {
        inlineKeyboard: ownerKb(linked),
      });
      return;
    }

    if (data === "owner_sales_today") {
      const text = await formatTodaySalesMessage(cafe);
      await sendTelegramMessage(chatId, text, {
        inlineKeyboard: ownerKb(linked),
      });
      return;
    }

    if (data === "owner_staff_duty") {
      const text = await formatStaffDutyMessage(cafe);
      await sendTelegramMessage(chatId, text, {
        inlineKeyboard: ownerKb(linked),
      });
      return;
    }

    if (data === "owner_report_range") {
      await setSession({
        chatId,
        userId: linked.user.id,
        cafeId: cafe.id,
        mode: "report_range",
      });
      await sendTelegramMessage(
        chatId,
        [
          "📈 <b>Savdo hisoboti</b>",
          `🏪 ${cafe.name}`,
          "",
          "Muddatni yozing (maks. 90 kun):",
          "<code>YYYY-MM-DD YYYY-MM-DD</code>",
          "Masalan: <code>2026-07-01 2026-07-23</code>",
          "",
          "Bekor: /menu",
        ].join("\n"),
        {
          inlineKeyboard: [
            [{ text: "📅 Bugun", callback_data: "owner_sales_today" }],
            [{ text: "📅 7 kun", callback_data: "owner_report_week" }],
            [{ text: "📅 30 kun", callback_data: "owner_report_month" }],
            [{ text: "🏠 Menyuga", callback_data: "owner_menu" }],
          ],
        },
      );
      return;
    }

    if (data === "owner_report_week" || data === "owner_report_month") {
      const period = data === "owner_report_week" ? "week" : "month";
      try {
        const report = await getReports(cafe.id, period);
        await setSession({
          chatId,
          userId: linked.user.id,
          cafeId: cafe.id,
          mode: "menu",
        });
        await sendTelegramMessage(
          chatId,
          formatDailyReportMessage(cafe.name, report),
          { inlineKeyboard: ownerKb(linked) },
        );
      } catch (e) {
        console.error("[owner_report_period]", e);
        await sendTelegramMessage(chatId, "⚠️ Hisobot olinmadi.", {
          inlineKeyboard: ownerKb(linked),
        });
      }
      return;
    }

    if (data === "owner_branches") {
      await sendTelegramMessage(
        chatId,
        formatBranchesMessage(linked.cafes, cafe.id),
        { inlineKeyboard: branchKeyboard(linked.cafes, cafe.id) },
      );
      return;
    }

    if (data.startsWith("owner_branch:")) {
      const cafeId = data.slice("owner_branch:".length);
      const next = linked.cafes.find((c) => c.id === cafeId);
      if (!next) {
        await sendTelegramMessage(chatId, "Filial topilmadi.", {
          inlineKeyboard: ownerKb(linked),
        });
        return;
      }
      await setSession({
        chatId,
        userId: linked.user.id,
        cafeId: next.id,
        mode: "menu",
      });
      await sendTelegramMessage(
        chatId,
        `✅ Faol filial: <b>${next.name}</b>\nKeyingi savdo/hisobot shu nuqta uchun.`,
        { inlineKeyboard: ownerMenuKeyboard(linked.cafes.length > 1) },
      );
      return;
    }

    if (data === "owner_staff_chat") {
      await setSession({
        chatId,
        userId: linked.user.id,
        cafeId: cafe.id,
        mode: "staff_chat",
      });
      const preview = await formatStaffChatPreview(cafe.id);
      await sendTelegramMessage(
        chatId,
        [
          `💬 <b>Xodimlar chati</b> — ${cafe.name}`,
          "Bu ichki chat (platforma Support emas).",
          "",
          preview,
        ].join("\n"),
        {
          inlineKeyboard: [
            [{ text: "🔄 Yangilash", callback_data: "owner_staff_chat" }],
            [{ text: "🏠 Menyuga", callback_data: "owner_menu" }],
          ],
        },
      );
      return;
    }
  } catch (e) {
    console.error("[handleOwnerCallback]", data, e);
    await sendTelegramMessage(
      chatId,
      "⚠️ Tugma ishlamadi. /menu yuboring yoki qayta urinib ko'ring.",
    );
  }
}

export async function handleBotTextMessage(chatId: string, text: string) {
  if (text === "/menu" || text === "/start") {
    await sendWelcome(chatId);
    return;
  }

  const session = await getSession(chatId);
  const linked = await findOwnerByChatId(chatId);

  if (linked?.cafe && session?.mode === "report_range") {
    const parsed = parseReportDateRange(text);
    if ("error" in parsed) {
      await sendTelegramMessage(chatId, parsed.error, {
        inlineKeyboard: [
          [{ text: "🏠 Menyuga", callback_data: "owner_menu" }],
        ],
      });
      return;
    }
    const reportText = await formatCustomReportMessage(
      linked.cafe,
      parsed.from,
      parsed.to,
    );
    await setSession({
      chatId,
      userId: linked.user.id,
      cafeId: linked.cafe.id,
      mode: "menu",
    });
    await sendTelegramMessage(chatId, reportText, {
      inlineKeyboard: ownerKb(linked),
    });
    return;
  }

  if (linked?.cafe && session?.mode === "staff_chat") {
    const result = await postOwnerStaffChatMessage({
      cafeId: linked.cafe.id,
      userId: linked.user.id,
      userName: linked.user.name,
      text,
    });
    if (!result.ok) {
      await sendTelegramMessage(chatId, `⚠️ ${result.error}`);
      return;
    }
    await sendTelegramMessage(
      chatId,
      "✅ Xabar ichki chatga yuborildi (platforma Support emas).",
      {
        inlineKeyboard: [
          [{ text: "🔄 Yangilash", callback_data: "owner_staff_chat" }],
          [{ text: "🏠 Menyuga", callback_data: "owner_menu" }],
        ],
      },
    );
    return;
  }

  if (linked?.cafe) {
    await sendTelegramMessage(
      chatId,
      "Menyudan tanlang yoki /menu yuboring.\n💬 Xodimlar bilan yozishish: «Xodim bilan bog‘lanish».",
      { inlineKeyboard: ownerKb(linked) },
    );
    return;
  }

  await sendTelegramMessage(
    chatId,
    "Bu bot — NOOKLINE kafe tizimi uchun.\nAsosiy sayt va ma’lumot — pastdagi tugmalar.",
    { inlineKeyboard: guestMenuKeyboard() },
  );
}

/** Rasm orqali platformaga yuborish o‘chirilgan */
export async function handleBotMediaMessage(opts: {
  chatId: string;
  messageId: number;
  caption?: string;
  replyToMessageId?: number;
}) {
  void opts.messageId;
  void opts.caption;
  void opts.replyToMessageId;
  const linked = await findOwnerByChatId(opts.chatId);
  await sendTelegramMessage(
    opts.chatId,
    linked?.cafe
      ? "📷 Rasm yuborish o‘chirilgan.\nKafe ishlari: menyu (savdo, xodim, hisobot, ichki chat)."
      : "📷 Bu botda rasm qabul qilinmaydi.\nTizim haqida — «Tizim haqida» yoki asosiy sayt.",
    {
      inlineKeyboard: linked?.cafe
        ? ownerKb(linked)
        : guestMenuKeyboard(),
    },
  );
}

/** @deprecated Rasm slot o‘chirilgan */
export async function activateAdminPhotoPendingFromStart(
  adminChatId: string,
  _cafeId: string,
) {
  await sendTelegramMessage(
    adminChatId,
    "📷 Telegram orqali rasm yuborish o‘chirilgan. Matn — saytdagi Platforma Support orqali.",
  );
}

/** @deprecated Rasm slot o‘chirilgan */
export async function openAdminPhotoRelaySlot(_cafeId: string) {
  return {
    ok: false as const,
    error: "Telegram orqali rasm yuborish o‘chirilgan. Matnli support — sayt orqali.",
  };
}

/**
 * Platforma matn javobi — botda platforma chat ochilmaydi.
 * Faqat qisqa eslatma (to‘liq matn saytda).
 */
export async function notifyOwnerTelegramSupportReply(opts: {
  cafeId: string;
  text: string;
  senderName?: string;
}) {
  void opts.text;
  void opts.senderName;
  const cafe = await prisma.cafe.findUnique({
    where: { id: opts.cafeId },
    select: { owner: { select: { telegramChatId: true } } },
  });
  const chatId = cafe?.owner?.telegramChatId;
  if (!chatId) return;

  await sendTelegramMessage(
    chatId,
    "💬 Platforma Supportda yangi xabar bor — matnni saytdan o'qing.",
  );
}

export async function sendSubscriptionExpiryWarnings() {
  const now = new Date();
  const from = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const cafes = await prisma.cafe.findMany({
    where: {
      owner: { telegramChatId: { not: null } },
      OR: [
        {
          status: "TRIAL",
          trialEndsAt: { gte: from, lte: to },
        },
        {
          status: "ACTIVE",
          subscriptionEndsAt: { gte: from, lte: to },
        },
      ],
    },
    select: {
      name: true,
      plan: true,
      status: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
      owner: { select: { telegramChatId: true } },
    },
  });

  let sent = 0;
  for (const cafe of cafes) {
    const chatId = cafe.owner.telegramChatId;
    if (!chatId) continue;
    const rawEnd =
      cafe.status === "TRIAL" ? cafe.trialEndsAt : cafe.subscriptionEndsAt;
    if (!rawEnd) continue;
    const end = new Date(rawEnd);
    if (Number.isNaN(end.getTime())) continue;
    const plan = getPlanConfig(cafe.plan as PlanId);
    const { ok } = await sendTelegramMessage(
      chatId,
      [
        "⏳ <b>Tarif eslatmasi</b>",
        `🏪 ${cafe.name}`,
        `📦 ${plan.name}`,
        `Tugashiga taxminan <b>3 kun</b> qoldi.`,
        `📅 ${end.toLocaleDateString("uz-UZ")}`,
        "",
        "Davom ettirish uchun dashboard billing bo'limiga o'ting.",
      ].join("\n"),
      { inlineKeyboard: ownerMenuKeyboard() },
    );
    if (ok) sent += 1;
  }
  return sent;
}

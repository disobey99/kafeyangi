import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getPlanConfig, type PlanId } from "@/lib/plans";
import {
  createSupportMessage,
  getOrCreateOpenConversation,
} from "@/lib/support-chat";
import {
  copyTelegramMessage as copyTelegramMessageRaw,
  getPlatformSupportTelegramChatId,
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

function copyTelegramMessage(opts: {
  toChatId: string;
  fromChatId: string;
  messageId: number;
  caption?: string;
}) {
  return copyTelegramMessageRaw({ ...opts, bot: "support" });
}

export type BotSessionMode = "menu" | "support" | "prospect";

type SessionRow = {
  chatId: string;
  userId: string | null;
  cafeId: string | null;
  mode: string;
};

export async function ensureTelegramSupportTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS TelegramBotSession (
      chatId TEXT NOT NULL PRIMARY KEY,
      userId TEXT,
      cafeId TEXT,
      mode TEXT NOT NULL DEFAULT 'menu',
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS TelegramOwnerLink (
      id TEXT NOT NULL PRIMARY KEY,
      userId TEXT NOT NULL,
      expiresAt DATETIME NOT NULL,
      usedAt DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS TelegramAdminRelay (
      adminMessageId TEXT NOT NULL PRIMARY KEY,
      targetChatId TEXT NOT NULL,
      cafeId TEXT,
      label TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS TelegramAdminPendingPhoto (
      adminChatId TEXT NOT NULL PRIMARY KEY,
      targetChatId TEXT NOT NULL,
      cafeId TEXT,
      label TEXT,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function saveAdminRelay(opts: {
  adminMessageId?: number;
  targetChatId: string;
  cafeId?: string | null;
  label?: string | null;
}) {
  if (opts.adminMessageId == null) return;
  await ensureTelegramSupportTables();
  const id = String(opts.adminMessageId);
  await prisma.$executeRaw`
    INSERT OR REPLACE INTO TelegramAdminRelay
      (adminMessageId, targetChatId, cafeId, label, createdAt)
    VALUES (
      ${id},
      ${opts.targetChatId},
      ${opts.cafeId ?? null},
      ${opts.label ?? null},
      CURRENT_TIMESTAMP
    )
  `;
}

async function getAdminRelay(adminMessageId: number) {
  await ensureTelegramSupportTables();
  const rows = await prisma.$queryRaw<
    Array<{
      targetChatId: string;
      cafeId: string | null;
      label: string | null;
    }>
  >`
    SELECT targetChatId, cafeId, label FROM TelegramAdminRelay
    WHERE adminMessageId = ${String(adminMessageId)}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

const PENDING_PHOTO_TTL_MS = 30 * 60 * 1000;

async function setAdminPendingPhoto(opts: {
  adminChatId: string;
  targetChatId: string;
  cafeId?: string | null;
  label?: string | null;
}) {
  await ensureTelegramSupportTables();
  const expiresAt = new Date(Date.now() + PENDING_PHOTO_TTL_MS).toISOString();
  await prisma.$executeRaw`
    INSERT OR REPLACE INTO TelegramAdminPendingPhoto
      (adminChatId, targetChatId, cafeId, label, expiresAt, createdAt)
    VALUES (
      ${opts.adminChatId},
      ${opts.targetChatId},
      ${opts.cafeId ?? null},
      ${opts.label ?? null},
      ${expiresAt},
      CURRENT_TIMESTAMP
    )
  `;
}

async function getAdminPendingPhoto(adminChatId: string) {
  await ensureTelegramSupportTables();
  const rows = await prisma.$queryRaw<
    Array<{
      targetChatId: string;
      cafeId: string | null;
      label: string | null;
      expiresAt: string | Date;
    }>
  >`
    SELECT targetChatId, cafeId, label, expiresAt
    FROM TelegramAdminPendingPhoto
    WHERE adminChatId = ${adminChatId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await clearAdminPendingPhoto(adminChatId);
    return null;
  }
  return row;
}

async function clearAdminPendingPhoto(adminChatId: string) {
  await ensureTelegramSupportTables();
  await prisma.$executeRaw`
    DELETE FROM TelegramAdminPendingPhoto WHERE adminChatId = ${adminChatId}
  `;
}

/** Platforma tugmasi /start=aphoto_cafeId — keyingi rasm shu kafega */
export async function activateAdminPhotoPendingFromStart(
  adminChatId: string,
  cafeId: string,
) {
  const platformChat = getPlatformSupportTelegramChatId();
  if (!platformChat || adminChatId !== platformChat) {
    await sendTelegramMessage(
      adminChatId,
      "Bu buyruq faqat platforma admin Telegrami uchun.",
    );
    return;
  }

  const rows = await prisma.$queryRaw<
    Array<{
      cafeName: string;
      ownerName: string;
      telegramChatId: string | null;
    }>
  >`
    SELECT c.name as cafeName, u.name as ownerName, u.telegramChatId
    FROM Cafe c
    JOIN User u ON u.id = c.ownerId
    WHERE c.id = ${cafeId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row?.telegramChatId) {
    await sendTelegramMessage(
      adminChatId,
      "Kafe topilmadi yoki egasi Telegram ulamagan.",
    );
    return;
  }

  const label = `${row.cafeName} / ${row.ownerName}`;
  await setAdminPendingPhoto({
    adminChatId,
    targetChatId: row.telegramChatId,
    cafeId,
    label,
  });

  await sendTelegramMessage(
    adminChatId,
    [
      "📷 <b>Rasm yuborishga tayyor</b>",
      `🏪 ${row.cafeName}`,
      `👤 ${row.ownerName}`,
      "",
      "Endi shu yerga <b>rasm yuboring</b> — avtomatik egaga ketadi.",
      "(Reply shart emas. 30 daqiqa amal qiladi.)",
    ].join("\n"),
  );
}

async function getSession(chatId: string): Promise<SessionRow | null> {
  await ensureTelegramSupportTables();
  const rows = await prisma.$queryRaw<SessionRow[]>`
    SELECT chatId, userId, cafeId, mode FROM TelegramBotSession WHERE chatId = ${chatId} LIMIT 1
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
      UPDATE TelegramBotSession
      SET userId = ${userId}, cafeId = ${cafeId}, mode = ${input.mode}, updatedAt = CURRENT_TIMESTAMP
      WHERE chatId = ${input.chatId}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO TelegramBotSession (chatId, userId, cafeId, mode, updatedAt)
      VALUES (${input.chatId}, ${userId}, ${cafeId}, ${input.mode}, CURRENT_TIMESTAMP)
    `;
  }
}

export async function findOwnerByChatId(chatId: string) {
  // User.telegramChatId — raw SQL (Prisma client ba'zan eski bo'lishi mumkin)
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      email: string;
      telegramChatId: string | null;
      cafeId: string | null;
      cafeName: string | null;
      cafeSlug: string | null;
      plan: string | null;
      status: string | null;
      trialEndsAt: string | Date | null;
      subscriptionEndsAt: string | Date | null;
    }>
  >`
    SELECT
      u.id, u.name, u.email, u.telegramChatId,
      c.id as cafeId, c.name as cafeName, c.slug as cafeSlug,
      c.plan, c.status, c.trialEndsAt, c.subscriptionEndsAt
    FROM User u
    LEFT JOIN Cafe c ON c.ownerId = u.id
    WHERE u.telegramChatId = ${chatId}
    ORDER BY c.createdAt ASC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const user = {
    id: row.id,
    name: row.name,
    email: row.email,
    telegramChatId: row.telegramChatId,
  };
  const cafe = row.cafeId
    ? {
        id: row.cafeId,
        name: row.cafeName ?? "",
        slug: row.cafeSlug ?? "",
        plan: row.plan ?? "STARTER",
        status: row.status ?? "TRIAL",
        trialEndsAt: row.trialEndsAt ? new Date(row.trialEndsAt) : null,
        subscriptionEndsAt: row.subscriptionEndsAt
          ? new Date(row.subscriptionEndsAt)
          : null,
      }
    : null;
  return { user, cafe };
}

export async function createOwnerTelegramLink(userId: string) {
  try {
    await ensureTelegramSupportTables();
    const bot = await getTelegramBotUsername("support");
    if (!bot || !getTelegramBotToken("support")) {
      return {
        ok: false as const,
        error: "Support Telegram bot sozlanmagan (TELEGRAM_SUPPORT_BOT_TOKEN yoki TELEGRAM_BOT_TOKEN)",
        status: 503,
      };
    }
    const id = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + LINK_TTL_MS).toISOString();
    await prisma.$executeRaw`
      INSERT INTO TelegramOwnerLink (id, userId, expiresAt, createdAt)
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
      name: string;
      email: string;
    }>
  >`
    SELECT l.id, l.userId, l.expiresAt, l.usedAt, u.name, u.email
    FROM TelegramOwnerLink l
    JOIN User u ON u.id = l.userId
    WHERE l.id = ${linkId}
    LIMIT 1
  `;
  const link = rows[0];
  if (!link) {
    await sendTelegramMessage(chatId, "Havola topilmadi. Dashboarddan qayta «Profilni ulash» ni bosing.");
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

  // Shu chat boshqa akkauntda bo'lsa — uzamiz
  await prisma.$executeRaw`
    UPDATE User SET telegramChatId = NULL WHERE telegramChatId = ${chatId} AND id != ${link.userId}
  `;
  await prisma.$executeRaw`
    UPDATE User SET telegramChatId = ${chatId} WHERE id = ${link.userId}
  `;
  const usedAt = new Date().toISOString();
  await prisma.$executeRaw`
    UPDATE TelegramOwnerLink SET usedAt = ${usedAt} WHERE id = ${link.id}
  `;

  const cafe = await prisma.cafe.findFirst({
    where: { ownerId: link.userId },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

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
      `👤 ${link.name}`,
      `✉️ ${link.email}`,
      cafe ? `🏪 ${cafe.name}` : "🏪 Kafe hali bog'lanmagan",
      "",
      "Matn — faqat Platforma Support (sayt).",
      "Skrinshot — shu botga rasm yuboring.",
    ].join("\n"),
    { inlineKeyboard: ownerMenuKeyboard() },
  );
  return { ok: true as const };
}

export function ownerMenuKeyboard(): TelegramInlineButton[][] {
  return [
    [{ text: "📋 Joriy tarif", callback_data: "owner_plan" }],
    [{ text: "📷 Skrinshot yuborish", callback_data: "owner_photo_help" }],
    [{ text: "🏠 Menyuga", callback_data: "owner_menu" }],
  ];
}

export function guestMenuKeyboard(): TelegramInlineButton[][] {
  const customer = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "").trim();
  const orderBtn: TelegramInlineButton =
    hasSeparateSupportBot() && customer
      ? { text: "🛒 Buyurtma (mijoz bot)", url: `https://t.me/${customer}` }
      : { text: "🛒 Buyurtma (mijoz)", callback_data: "cust_home" };
  return [
    [orderBtn],
    [{ text: "📷 Skrinshot yuborish", callback_data: "guest_photo_help" }],
    [{ text: "ℹ️ Support haqida", callback_data: "guest_about" }],
  ];
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
        : hasSeparateSupportBot()
          ? []
          : [[{ text: "🛒 Mijoz buyurtmasi", callback_data: "cust_home" }]];
    await sendTelegramMessage(
      chatId,
      [
        `🛠 <b>NOOKLINE Support</b>`,
        `Xush kelibsiz, ${linked.user.name}!`,
        `🏪 ${linked.cafe.name}`,
        "",
        "Bu menyu — egasi / support uchun.",
        "Muammo skrinshotini shu yerga rasm qilib yuboring.",
        hasSeparateSupportBot()
          ? "Buyurtma — alohida mijoz (delivery) botida."
          : "Mijoz buyurtmasi: /start",
      ].join("\n"),
      {
        inlineKeyboard: [...ownerMenuKeyboard(), ...extraRows],
      },
    );
    return;
  }

  await setSession({ chatId, mode: "menu", userId: null, cafeId: null });
  await sendTelegramMessage(
    chatId,
    [
      `🛠 <b>NOOKLINE Support</b>`,
      "",
      "Kafe egasi: Dashboarddan «Telegram profilni ulash».",
      hasSeparateSupportBot()
        ? "Buyurtma berish — mijoz (delivery) botida."
        : "Mijoz buyurtmasi uchun /start bosing.",
    ].join("\n"),
    { inlineKeyboard: guestMenuKeyboard() },
  );
}

export async function handleOwnerCallback(chatId: string, data: string) {
  try {
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

    if (data === "owner_menu") {
      await setSession({
        chatId,
        userId: linked!.user.id,
        cafeId: linked!.cafe!.id,
        mode: "menu",
      });
      await sendTelegramMessage(chatId, "Asosiy menyu:", {
        inlineKeyboard: ownerMenuKeyboard(),
      });
      return;
    }

    if (data === "owner_plan") {
      const text = await formatOwnerPlanMessage(linked!.cafe!.id);
      await sendTelegramMessage(chatId, text, {
        inlineKeyboard: ownerMenuKeyboard(),
      });
      return;
    }

    if (data === "owner_photo_help") {
      await setSession({
        chatId,
        userId: linked!.user.id,
        cafeId: linked!.cafe!.id,
        mode: "menu",
      });
      await sendTelegramMessage(
        chatId,
        "📷 <b>Skrinshot</b>\nShu yerga rasm yuboring — admin Telegramiga yetadi.\n\nMatn yozish: Dashboard / Platforma Support.",
        { inlineKeyboard: ownerMenuKeyboard() },
      );
      return;
    }

    if (data === "guest_about") {
      await sendTelegramMessage(
        chatId,
        [
          "<b>NOOKLINE Support</b>",
          "",
          "Bu bo‘lim — kafe egasi / support uchun.",
          "Matnli savollar — sayt orqali.",
          "Skrinshot — shu botga rasm.",
          "",
          "Buyurtma berish uchun «Buyurtma (mijoz)» ni bosing.",
        ].join("\n"),
        { inlineKeyboard: guestMenuKeyboard() },
      );
      return;
    }

    if (data === "guest_photo_help") {
      await setSession({ chatId, mode: "menu", userId: null, cafeId: null });
      await sendTelegramMessage(
        chatId,
        "📷 Skrinshotni shu yerga yuboring.\nMatnli yozishmalar botda yo'q — saytdan murojaat qiling.",
        { inlineKeyboard: guestMenuKeyboard() },
      );
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

  // Botda matnli chat yo'q — faqat rasm / menyu
  const linked = await findOwnerByChatId(chatId);
  if (linked?.cafe) {
    await sendTelegramMessage(
      chatId,
      "💬 Matn almashinuvi faqat <b>Platforma Support</b> (sayt) orqali.\n\nSkrinshot bo'lsa — shu botga <b>rasm</b> yuboring.",
      { inlineKeyboard: ownerMenuKeyboard() },
    );
    return;
  }

  await sendTelegramMessage(
    chatId,
    "Bu botda chat yo'q.\nSkrinshot — rasm yuboring.\nMatnli savol — sayt orqali.",
    { inlineKeyboard: guestMenuKeyboard() },
  );
}

/**
 * Rasm — platformaga emas, Telegram copyMessage (diskka yozilmaydi).
 * Admin: kelgan xabarga reply qilib rasm → o'sha odamga.
 */
export async function handleBotMediaMessage(opts: {
  chatId: string;
  messageId: number;
  caption?: string;
  replyToMessageId?: number;
}) {
  const caption = opts.caption?.trim() || "";
  const platformChat = getPlatformSupportTelegramChatId();
  const isAdminChat = !!platformChat && opts.chatId === platformChat;

  // Admin reply → aniq odamga
  if (isAdminChat && opts.replyToMessageId) {
    await deliverAdminRelayPhoto({
      adminChatId: opts.chatId,
      messageId: opts.messageId,
      replyToMessageId: opts.replyToMessageId,
      caption,
    });
    return;
  }

  // Platforma tugmasidan ochilgan «tayyor» rejim — reply shart emas
  if (isAdminChat) {
    const pending = await getAdminPendingPhoto(opts.chatId);
    if (pending) {
      await deliverAdminPhotoToTarget({
        adminChatId: opts.chatId,
        messageId: opts.messageId,
        targetChatId: pending.targetChatId,
        cafeId: pending.cafeId,
        label: pending.label,
        caption,
      });
      await clearAdminPendingPhoto(opts.chatId);
      return;
    }
  }

  // Ulangan egasi — istalgan vaqtda skrinshot (matn chatsiz)
  const linked = await findOwnerByChatId(opts.chatId);
  if (linked?.cafe && linked.user) {
    await deliverOwnerSupportMedia({
      chatId: opts.chatId,
      messageId: opts.messageId,
      userId: linked.user.id,
      cafeId: linked.cafe.id,
      caption,
    });
    return;
  }

  // Ulanmagan — faqat rasm (yangi mijoz skrinshoti)
  if (!isAdminChat) {
    const ok = await forwardProspectMediaToTelegram(
      opts.chatId,
      opts.messageId,
      caption,
    );
    await sendTelegramMessage(
      opts.chatId,
      ok
        ? "✅ Skrinshot yuborildi."
        : "Rasm qabul qilinmadi: PLATFORM_SUPPORT_TELEGRAM_CHAT_ID sozlanmagan.",
      { inlineKeyboard: guestMenuKeyboard() },
    );
    return;
  }

  await sendTelegramMessage(
    opts.chatId,
    "Rasm uchun Platforma Support dagi rasm tugmasini bosing yoki kelgan xabarga Reply qiling.",
  );
}

async function deliverAdminRelayPhoto(opts: {
  adminChatId: string;
  messageId: number;
  replyToMessageId: number;
  caption: string;
}) {
  const relay = await getAdminRelay(opts.replyToMessageId);
  if (!relay) {
    await sendTelegramMessage(
      opts.adminChatId,
      "Bu xabarga bog'langan suhbat topilmadi.\nPlatformadagi rasm tugmasini bosing.",
    );
    return;
  }

  await deliverAdminPhotoToTarget({
    adminChatId: opts.adminChatId,
    messageId: opts.messageId,
    targetChatId: relay.targetChatId,
    cafeId: relay.cafeId,
    label: relay.label,
    caption: opts.caption,
  });
}

async function deliverAdminPhotoToTarget(opts: {
  adminChatId: string;
  messageId: number;
  targetChatId: string;
  cafeId: string | null;
  label: string | null;
  caption: string;
}) {
  if (opts.targetChatId === opts.adminChatId) {
    await sendTelegramMessage(
      opts.adminChatId,
      "✅ (Test) Admin va egasi bir xil Telegram — rasm shu chatda. Prod da alohida admin chat ID ishlating.",
    );
    if (opts.cafeId) {
      const conversationId = await getOrCreateOpenConversation(opts.cafeId);
      await createSupportMessage({
        conversationId,
        cafeId: opts.cafeId,
        senderType: "PLATFORM",
        senderUserId: "telegram-admin",
        senderName: "Platform Admin (Telegram)",
        text: "📷 Rasm Telegram orqali yuborildi (test — bir xil chat)",
      });
    }
    return;
  }

  const copied = await copyTelegramMessage({
    toChatId: opts.targetChatId,
    fromChatId: opts.adminChatId,
    messageId: opts.messageId,
    caption: opts.caption || undefined,
  });

  if (!copied.ok) {
    await sendTelegramMessage(opts.adminChatId, "⚠️ Rasm yuborilmadi.");
    return;
  }

  if (opts.cafeId) {
    const conversationId = await getOrCreateOpenConversation(opts.cafeId);
    await createSupportMessage({
      conversationId,
      cafeId: opts.cafeId,
      senderType: "PLATFORM",
      senderUserId: "telegram-admin",
      senderName: "Platform Admin (Telegram)",
      text: opts.caption
        ? `📷 Rasm Telegram orqali yuborildi\n${opts.caption.slice(0, 1800)}`
        : "📷 Rasm Telegram orqali yuborildi",
    });
    const owner = await findOwnerByChatId(opts.targetChatId);
    if (owner?.user) {
      await setSession({
        chatId: opts.targetChatId,
        userId: owner.user.id,
        cafeId: opts.cafeId,
        mode: "menu",
      });
    }
  }

  await sendTelegramMessage(
    opts.adminChatId,
    `✅ Rasm yuborildi${opts.label ? `: ${opts.label}` : ""}`,
  );
}

/**
 * Platforma rasm tugmasi: pending rejim + Telegram deep link (reply UI ochib bo'lmaydi,
 * lekin keyingi rasm avtomatik shu kafega ketadi).
 */
export async function openAdminPhotoRelaySlot(cafeId: string) {
  const target = getPlatformSupportTelegramChatId();
  if (!target) {
    return {
      ok: false as const,
      error: "PLATFORM_SUPPORT_TELEGRAM_CHAT_ID sozlanmagan",
    };
  }

  const rows = await prisma.$queryRaw<
    Array<{
      cafeName: string;
      ownerName: string;
      telegramChatId: string | null;
    }>
  >`
    SELECT c.name as cafeName, u.name as ownerName, u.telegramChatId
    FROM Cafe c
    JOIN User u ON u.id = c.ownerId
    WHERE c.id = ${cafeId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { ok: false as const, error: "Kafe topilmadi" };
  if (!row.telegramChatId) {
    return {
      ok: false as const,
      error: "Egasi Telegram profilini ulamagan — rasm yuborib bo'lmaydi",
    };
  }

  const label = `${row.cafeName} / ${row.ownerName}`;
  await setAdminPendingPhoto({
    adminChatId: target,
    targetChatId: row.telegramChatId,
    cafeId,
    label,
  });

  const sent = await sendTelegramMessage(
    target,
    [
      "📷 <b>Rasm yuborishga tayyor</b>",
      `🏪 ${row.cafeName}`,
      `👤 ${row.ownerName}`,
      "",
      "Endi shu yerga <b>rasm yuboring</b> — avtomatik egaga ketadi.",
      "(Reply shart emas)",
    ].join("\n"),
  );
  if (sent.messageId != null) {
    await saveAdminRelay({
      adminMessageId: sent.messageId,
      targetChatId: row.telegramChatId,
      cafeId,
      label,
    });
  }

  const conversationId = await getOrCreateOpenConversation(cafeId);
  await createSupportMessage({
    conversationId,
    cafeId,
    senderType: "PLATFORM",
    senderUserId: "telegram-admin",
    senderName: "Platform Admin",
    text: "📷 Telegramda rasm yuborishga tayyor — botga rasm yuboring",
  });

  const bot = await getTelegramBotUsername("support");
  const telegramUrl = bot
    ? `https://t.me/${bot}?start=aphoto_${cafeId}`
    : null;

  return { ok: true as const, telegramUrl };
}

async function deliverOwnerSupportMedia(opts: {
  chatId: string;
  messageId: number;
  userId: string;
  cafeId: string;
  caption: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { id: true, name: true },
  });
  if (!user) {
    await sendTelegramMessage(opts.chatId, "Sessiya eskirgan. /start bosing.");
    return;
  }

  const cafe = await prisma.cafe.findUnique({
    where: { id: opts.cafeId },
    select: { name: true },
  });

  const target = getPlatformSupportTelegramChatId();
  if (!target) {
    await sendTelegramMessage(
      opts.chatId,
      "⚠️ Rasm yetkazilmadi: PLATFORM_SUPPORT_TELEGRAM_CHAT_ID sozlanmagan.",
    );
    return;
  }

  const header = [
    "📷 <b>Kafe rasmi</b>",
    `🏪 ${cafe?.name ?? "Kafe"}`,
    `👤 ${user.name}`,
    opts.caption ? "" : null,
    opts.caption ? opts.caption.slice(0, 500) : null,
  ]
    .filter((x): x is string => x != null)
    .join("\n");

  const label = `${cafe?.name ?? "Kafe"} / ${user.name}`;
  let delivered = false;

  // Bir xil chat (admin = egasi test) — faqat izoh; aks holda rasm nusxasi
  if (target === opts.chatId) {
    const sent = await sendTelegramMessage(
      target,
      `${header}\n\n(Yuqoridagi rasm)\n\n↩️ Reply qilib javob rasmi yuborishingiz mumkin.`,
    );
    delivered = sent.ok;
    await saveAdminRelay({
      adminMessageId: sent.messageId,
      targetChatId: opts.chatId,
      cafeId: opts.cafeId,
      label,
    });
  } else {
    const head = await sendTelegramMessage(target, header);
    await saveAdminRelay({
      adminMessageId: head.messageId,
      targetChatId: opts.chatId,
      cafeId: opts.cafeId,
      label,
    });
    const copied = await copyTelegramMessage({
      toChatId: target,
      fromChatId: opts.chatId,
      messageId: opts.messageId,
    });
    delivered = copied.ok;
    await saveAdminRelay({
      adminMessageId: copied.messageId,
      targetChatId: opts.chatId,
      cafeId: opts.cafeId,
      label,
    });
  }

  // Platformada rasm ochilmaydi — faqat ogohlantirish
  const conversationId = await getOrCreateOpenConversation(opts.cafeId);
  const note = delivered
    ? "📷 Rasm Telegram orqali yuborildi (admin Telegramida)"
    : "📷 Rasm yuborildi, lekin admin Telegramiga yetkazilmadi";
  await createSupportMessage({
    conversationId,
    cafeId: opts.cafeId,
    senderType: "CAFE",
    senderUserId: user.id,
    senderName: `${user.name} (Telegram)`,
    text: opts.caption ? `${note}\n${opts.caption.slice(0, 1800)}` : note,
  });

  await sendTelegramMessage(opts.chatId, "✅");
}

async function forwardProspectMediaToTelegram(
  fromChatId: string,
  messageId: number,
  caption: string,
) {
  const target = getPlatformSupportTelegramChatId();
  if (!target) return false;

  const header = [
    "🆕 <b>Yangi mijoz — rasm</b>",
    `Chat: <code>${fromChatId}</code>`,
    caption ? "" : null,
    caption ? caption.slice(0, 500) : null,
    "",
    "↩️ Reply qilib javob rasmi yuborishingiz mumkin.",
  ]
    .filter((x): x is string => x != null)
    .join("\n");

  if (target === fromChatId) {
    const sent = await sendTelegramMessage(
      target,
      `${header}\n\n(Yuqoridagi rasm)`,
    );
    await saveAdminRelay({
      adminMessageId: sent.messageId,
      targetChatId: fromChatId,
      cafeId: null,
      label: "Yangi mijoz",
    });
    return sent.ok;
  }

  const head = await sendTelegramMessage(target, header);
  await saveAdminRelay({
    adminMessageId: head.messageId,
    targetChatId: fromChatId,
    cafeId: null,
    label: "Yangi mijoz",
  });
  const copied = await copyTelegramMessage({
    toChatId: target,
    fromChatId,
    messageId,
  });
  await saveAdminRelay({
    adminMessageId: copied.messageId,
    targetChatId: fromChatId,
    cafeId: null,
    label: "Yangi mijoz",
  });
  return copied.ok;
}

/**
 * Platforma matn javobi — botda chat ochilmaydi.
 * Faqat qisqa eslatma (to'liq matn saytda).
 */
export async function notifyOwnerTelegramSupportReply(opts: {
  cafeId: string;
  text: string;
  senderName?: string;
}) {
  void opts.text;
  void opts.senderName;
  const rows = await prisma.$queryRaw<
    Array<{ telegramChatId: string | null }>
  >`
    SELECT u.telegramChatId
    FROM Cafe c
    JOIN User u ON u.id = c.ownerId
    WHERE c.id = ${opts.cafeId}
    LIMIT 1
  `;
  const chatId = rows[0]?.telegramChatId;
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
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const cafes = await prisma.$queryRaw<
    Array<{
      name: string;
      plan: string;
      status: string;
      trialEndsAt: string | Date | null;
      subscriptionEndsAt: string | Date | null;
      telegramChatId: string | null;
      ownerName: string | null;
    }>
  >`
    SELECT c.name, c.plan, c.status, c.trialEndsAt, c.subscriptionEndsAt,
           u.telegramChatId, u.name as ownerName
    FROM Cafe c
    JOIN User u ON u.id = c.ownerId
    WHERE u.telegramChatId IS NOT NULL
      AND (
        (c.status = 'TRIAL' AND c.trialEndsAt >= ${fromIso} AND c.trialEndsAt <= ${toIso})
        OR
        (c.status = 'ACTIVE' AND c.subscriptionEndsAt >= ${fromIso} AND c.subscriptionEndsAt <= ${toIso})
      )
  `;

  let sent = 0;
  for (const cafe of cafes) {
    const chatId = cafe.telegramChatId;
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
        "Davom ettirish uchun dashboard billing bo'limiga o'ting yoki supportga yozing.",
      ].join("\n"),
      { inlineKeyboard: ownerMenuKeyboard() },
    );
    if (ok) sent += 1;
  }
  return sent;
}

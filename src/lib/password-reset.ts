import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured, sendPasswordResetCode } from "@/lib/email";
import { getTelegramBotToken, getTelegramBotUsername, sendTelegramMessage } from "@/lib/telegram";

const CODE_TTL_MS = 15 * 60 * 1000;
const LINK_TTL_MS = 15 * 60 * 1000;
const EMAIL_DAILY_MS = 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

async function findUserByEmail(emailRaw: string) {
  const email = emailRaw.trim();
  const exact = await prisma.user.findUnique({ where: { email } });
  if (exact) return exact;
  const lower = email.toLowerCase();
  if (lower === email) return null;
  return prisma.user.findUnique({ where: { email: lower } });
}

async function latestOpenToken(userId: string) {
  return prisma.passwordResetToken.findFirst({
    where: { userId, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

async function countEmailResetsLastDay(userId: string) {
  const since = new Date(Date.now() - EMAIL_DAILY_MS);
  return prisma.passwordResetToken.count({
    where: {
      userId,
      channel: "EMAIL",
      createdAt: { gte: since },
    },
  });
}

async function insertResetCode(userId: string, channel: "EMAIL" | "TELEGRAM") {
  const code = generateCode();
  await prisma.passwordResetToken.create({
    data: {
      userId,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      channel,
    },
  });
  return code;
}

export async function requestPasswordReset(emailRaw: string) {
  if (!isEmailConfigured()) {
    return {
      ok: false as const,
      error: "Email yuborish hozircha sozlanmagan. Qo'llab-quvvatlashga murojaat qiling.",
      status: 503,
    };
  }

  const user = await findUserByEmail(emailRaw);
  // Email bor-yo'qligini ochib yubormaslik
  if (!user) {
    return {
      ok: true as const,
      message: "Agar email ro'yxatdan o'tgan bo'lsa, kod yuborildi.",
      emailSent: false as const,
      useTelegramForResend: true as const,
    };
  }

  const emailCount = await countEmailResetsLastDay(user.id);
  if (emailCount >= 1) {
    return {
      ok: false as const,
      error:
        "Bugun email orqali kod allaqachon yuborilgan. Qayta olish uchun Telegram botdan foydalaning.",
      status: 429,
      useTelegramForResend: true as const,
    };
  }

  const code = await insertResetCode(user.id, "EMAIL");

  try {
    await sendPasswordResetCode(user.email, code);
  } catch (err) {
    console.error("[password-reset] email send failed", err);
    return {
      ok: false as const,
      error: "Email yuborilmadi. SMTP / Gmail sozlamalarini tekshiring.",
      status: 502,
    };
  }

  return {
    ok: true as const,
    message:
      "Agar email ro'yxatdan o'tgan bo'lsa, kod yuborildi. Qayta kerak bo'lsa — Telegram orqali oling.",
    emailSent: true as const,
    useTelegramForResend: true as const,
  };
}

/** Kodni qayta olish — Telegram deep-link */
export async function createTelegramPasswordResetLink(emailRaw: string) {
  const botUser = await getTelegramBotUsername("support");
  if (!botUser || !getTelegramBotToken("support")) {
    return {
      ok: false as const,
      error: "Telegram bot hozircha sozlanmagan. Keyinroq urinib ko'ring.",
      status: 503,
    };
  }

  const user = await findUserByEmail(emailRaw);
  // Enumeration himoyasi — havola faqat mavjud user uchun, lekin javob umumiy
  if (!user) {
    return {
      ok: true as const,
      message:
        "Agar email ro'yxatdan o'tgan bo'lsa, Telegram bot orqali kod olishingiz mumkin.",
      telegramUrl: `https://t.me/${botUser}?start=help_reset`,
    };
  }

  const id = crypto.randomBytes(16).toString("hex"); // 32 hex → start=rst_xxx < 64

  await prisma.telegramPasswordLink.create({
    data: {
      id,
      userId: user.id,
      expiresAt: new Date(Date.now() + LINK_TTL_MS),
    },
  });

  const telegramUrl = `https://t.me/${botUser}?start=rst_${id}`;

  return {
    ok: true as const,
    message:
      "Telegram botni oching — havola orqali tasdiqlang, kod shu yerga yuboriladi.",
    telegramUrl,
  };
}

/** Webhook: /start rst_<token> */
export async function fulfillTelegramPasswordReset(
  linkId: string,
  chatId: string,
) {
  const link = await prisma.telegramPasswordLink.findUnique({
    where: { id: linkId },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!link) {
    await sendTelegramMessage(
      chatId,
      "Havola topilmadi yoki eskirgan. Saytdan qayta «Kodni qayta olish (Telegram)» ni bosing.",
      { bot: "support" },
    );
    return { ok: false as const };
  }

  if (link.usedAt) {
    await sendTelegramMessage(
      chatId,
      "Bu havola allaqachon ishlatilgan. Saytdan yangi havola oling.",
      { bot: "support" },
    );
    return { ok: false as const };
  }

  if (link.expiresAt.getTime() < Date.now()) {
    await sendTelegramMessage(
      chatId,
      "Havola muddati tugagan (15 daqiqa). Saytdan qayta so'rang.",
      { bot: "support" },
    );
    return { ok: false as const };
  }

  await prisma.$transaction([
    prisma.telegramPasswordLink.update({
      where: { id: link.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: link.userId },
      data: { telegramChatId: chatId },
    }),
  ]);

  const code = await insertResetCode(link.userId, "TELEGRAM");

  const sent = await sendTelegramMessage(
    chatId,
    [
      `🔐 <b>Parol tiklash kodi</b>`,
      "",
      `Email: <code>${link.user.email}</code>`,
      `Kod: <code>${code}</code>`,
      "",
      `⏱ ${Math.floor(CODE_TTL_MS / 60000)} daqiqa ichida saytda kiriting.`,
      "Kodni hech kimga bermang.",
    ].join("\n"),
    { bot: "support" },
  );

  if (!sent.ok) {
    await sendTelegramMessage(
      chatId,
      "Kod yuborishda xatolik. Keyinroq qayta urinib ko'ring.",
      { bot: "support" },
    );
    return { ok: false as const };
  }

  return { ok: true as const };
}

export async function resetPasswordWithCode(input: {
  email: string;
  code: string;
  newPassword: string;
}) {
  const code = input.code.trim().replace(/\s/g, "");
  const newPassword = input.newPassword;

  if (!/^\d{6}$/.test(code)) {
    return { ok: false as const, error: "6 xonali kod kiriting", status: 400 };
  }
  if (newPassword.length < 6) {
    return {
      ok: false as const,
      error: "Yangi parol kamida 6 belgidan iborat bo'lsin",
      status: 400,
    };
  }

  const user = await findUserByEmail(input.email);
  if (!user) {
    return { ok: false as const, error: "Kod noto'g'ri yoki muddati o'tgan", status: 400 };
  }

  const token = await latestOpenToken(user.id);
  if (!token || token.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, error: "Kod noto'g'ri yoki muddati o'tgan", status: 400 };
  }

  if (token.attempts >= MAX_ATTEMPTS) {
    return {
      ok: false as const,
      error: "Urinishlar soni tugadi. Yangi kodni Telegram orqali oling.",
      status: 429,
    };
  }

  if (token.codeHash !== hashCode(code)) {
    await prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false as const, error: "Kod noto'g'ri yoki muddati o'tgan", status: 400 };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true as const, message: "Parol yangilandi. Endi kiring." };
}

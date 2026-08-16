import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isEmailConfigured, sendPasswordResetCode } from "@/lib/email";
import { getPlatformSettings } from "@/lib/platform-settings";
import { checkRateLimit } from "@/lib/rate-limit";

const CODE_TTL_MS = 15 * 60 * 1000;
/** Bitta kod uchun noto‘g‘ri urinishlar */
const MAX_CODE_ATTEMPTS = 3;
/** 24 soatda bir emailga maksimal yuborish */
const MAX_SENDS_PER_DAY = 3;
/** Yuborishlar orasidagi minimal kutish (soniya) — spamdan himoya */
const SEND_COOLDOWNS_SEC = [0, 180, 900]; // 0 → 3 daq → 15 daq
/** Butun platforma SMTP (Gmail) — soatiga */
const GLOBAL_SMTP_PER_HOUR = 40;

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

export async function getPasswordResetSupportContact() {
  const s = await getPlatformSettings();
  return {
    email: s.contactEmail?.trim() || null,
    phone: (s.supportPhone?.trim() || s.contactPhone?.trim()) || null,
    telegram: process.env.TELEGRAM_SUPPORT_BOT_USERNAME?.replace(/^@/, "").trim() || null,
  };
}

function supportHint(contact: Awaited<ReturnType<typeof getPasswordResetSupportContact>>) {
  const parts: string[] = [];
  if (contact.email) parts.push(`email: ${contact.email}`);
  if (contact.phone) parts.push(`tel: ${contact.phone}`);
  if (contact.telegram) parts.push(`Telegram: @${contact.telegram}`);
  return parts.length
    ? `Support: ${parts.join(" · ")}`
    : "Supportga murojaat qiling (sayt orqali).";
}

async function countEmailSendsLastDay(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.passwordResetToken.count({
    where: {
      userId,
      channel: "EMAIL",
      createdAt: { gte: since },
    },
  });
}

async function lastEmailSendAt(userId: string) {
  const row = await prisma.passwordResetToken.findFirst({
    where: { userId, channel: "EMAIL" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return row?.createdAt ?? null;
}

async function insertResetCode(userId: string) {
  const code = generateCode();
  await prisma.passwordResetToken.create({
    data: {
      userId,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      channel: "EMAIL",
    },
  });
  return code;
}

export async function requestPasswordReset(emailRaw: string) {
  const support = await getPasswordResetSupportContact();

  if (!isEmailConfigured()) {
    return {
      ok: false as const,
      error: "Email yuborish hozircha sozlanmagan. " + supportHint(support),
      status: 503,
      support,
      locked: true as const,
    };
  }

  const user = await findUserByEmail(emailRaw);
  // Enumeration himoyasi — mavjud bo‘lmasa ham umumiy javob
  if (!user) {
    return {
      ok: true as const,
      message:
        "Agar email ro‘yxatdan o‘tgan bo‘lsa, kod yuborildi. Kelmasa spam papkani tekshiring.",
      emailSent: false as const,
      sendsLeft: MAX_SENDS_PER_DAY,
      support,
    };
  }

  const sendsToday = await countEmailSendsLastDay(user.id);
  if (sendsToday >= MAX_SENDS_PER_DAY) {
    return {
      ok: false as const,
      error:
        "Bugungi 3 ta kod so‘rovi tugadi. Hisobni tiklash uchun supportga murojaat qiling.",
      status: 429,
      locked: true as const,
      support,
      sendsLeft: 0,
    };
  }

  const lastAt = await lastEmailSendAt(user.id);
  const cooldownSec = SEND_COOLDOWNS_SEC[Math.min(sendsToday, SEND_COOLDOWNS_SEC.length - 1)] ?? 900;
  if (lastAt && cooldownSec > 0) {
    const elapsed = (Date.now() - lastAt.getTime()) / 1000;
    if (elapsed < cooldownSec) {
      const wait = Math.ceil(cooldownSec - elapsed);
      return {
        ok: false as const,
        error: `Keyingi kodni ${wait} soniyadan keyin so‘rash mumkin (email spamdan himoya).`,
        status: 429,
        retryAfterSec: wait,
        sendsLeft: MAX_SENDS_PER_DAY - sendsToday,
        support,
      };
    }
  }

  // Global SMTP — Gmail akkaunt spamga tushmasin; yuk yuqori bo‘lsa kutish
  const global = checkRateLimit({
    key: "forgot:smtp:global",
    limit: GLOBAL_SMTP_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });
  if (!global.ok) {
    // So‘rovlarni vaqt bo‘yicha tarqatish
    const stagger = Math.min(global.retryAfterSec, 900);
    return {
      ok: false as const,
      error: `Hozir ko‘p so‘rov bor. Taxminan ${stagger} soniyadan keyin qayta urinib ko‘ring.`,
      status: 429,
      retryAfterSec: stagger,
      sendsLeft: MAX_SENDS_PER_DAY - sendsToday,
      support,
    };
  }

  const code = await insertResetCode(user.id);

  try {
    await sendPasswordResetCode(user.email, code);
  } catch (err) {
    console.error("[requestPasswordReset] email", err);
    return {
      ok: false as const,
      error: "Email yuborilmadi. Keyinroq urinib ko‘ring yoki supportga yozing.",
      status: 502,
      support,
    };
  }

  const left = MAX_SENDS_PER_DAY - sendsToday - 1;
  return {
    ok: true as const,
    message:
      left > 0
        ? `Kod emailga yuborildi. Bugun yana ${left} marta so‘rash mumkin.`
        : "Kod emailga yuborildi. Bugungi so‘rovlar tugadi — kelmasa supportga murojaat qiling.",
    emailSent: true as const,
    sendsLeft: left,
    support,
  };
}

export async function resetPasswordWithCode(input: {
  email: string;
  code: string;
  newPassword: string;
}) {
  const support = await getPasswordResetSupportContact();
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

  if (token.attempts >= MAX_CODE_ATTEMPTS) {
    await prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });
    return {
      ok: false as const,
      error:
        "3 ta noto‘g‘ri urinish. Yangi kod so‘rang yoki supportga murojaat qiling.",
      status: 429,
      locked: true as const,
      support,
    };
  }

  if (token.codeHash !== hashCode(code)) {
    const next = token.attempts + 1;
    await prisma.passwordResetToken.update({
      where: { id: token.id },
      data: {
        attempts: next,
        ...(next >= MAX_CODE_ATTEMPTS ? { usedAt: new Date() } : {}),
      },
    });
    if (next >= MAX_CODE_ATTEMPTS) {
      return {
        ok: false as const,
        error:
          "3 ta noto‘g‘ri urinish tugadi. Yangi kod so‘rang yoki supportga murojaat qiling.",
        status: 429,
        locked: true as const,
        support,
      };
    }
    return {
      ok: false as const,
      error: `Kod noto‘g‘ri. Qolgan urinish: ${MAX_CODE_ATTEMPTS - next}`,
      status: 400,
      attemptsLeft: MAX_CODE_ATTEMPTS - next,
    };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordChangedAt: now },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  return { ok: true as const, message: "Parol yangilandi. Endi kiring." };
}

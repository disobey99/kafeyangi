import { getConfiguredAppUrl } from "@/lib/app-url";

export type TelegramInlineButton =
  | { text: string; web_app: { url: string } }
  | { text: string; url: string }
  | { text: string; callback_data: string };

export type TelegramSendResult = { ok: boolean; messageId?: number };

/** customer = buyurtma/delivery bot; support = egasi/support bot */
export type TelegramBotRole = "customer" | "support";

export function hasSeparateSupportBot(): boolean {
  const customer = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const support = process.env.TELEGRAM_SUPPORT_BOT_TOKEN?.trim();
  return Boolean(customer && support && customer !== support);
}

export function getTelegramBotToken(role: TelegramBotRole = "customer"): string | null {
  if (role === "support") {
    return (
      process.env.TELEGRAM_SUPPORT_BOT_TOKEN?.trim() ||
      process.env.TELEGRAM_BOT_TOKEN?.trim() ||
      null
    );
  }
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: {
    inlineKeyboard?: TelegramInlineButton[][];
    /** default: customer (buyurtma bot) */
    bot?: TelegramBotRole;
  },
): Promise<TelegramSendResult> {
  const token = getTelegramBotToken(options?.bot ?? "customer");
  if (!token || !chatId) return { ok: false };

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    };
    if (options?.inlineKeyboard?.length) {
      body.reply_markup = { inline_keyboard: options.inlineKeyboard };
    }

    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: { message_id?: number };
      description?: string;
    };
    if (!res.ok || !data.ok) {
      console.error(
        "[sendTelegramMessage]",
        options?.bot ?? "customer",
        res.status,
        data.description?.slice(0, 300) ?? "",
      );
      return { ok: false };
    }
    return { ok: true, messageId: data.result?.message_id };
  } catch (e) {
    console.error("[sendTelegramMessage]", e);
    return { ok: false };
  }
}

/**
 * Rasm/media ni serverga yuklamasdan Telegram ichida nusxalaydi (copyMessage).
 * Yuk faqat Telegram API da — disk/storage band bo'lmaydi.
 */
export async function copyTelegramMessage(opts: {
  toChatId: string;
  fromChatId: string;
  messageId: number;
  caption?: string;
  bot?: TelegramBotRole;
}): Promise<TelegramSendResult> {
  const token = getTelegramBotToken(opts.bot ?? "customer");
  if (!token || !opts.toChatId || !opts.fromChatId || !opts.messageId) {
    return { ok: false };
  }
  try {
    const body: Record<string, unknown> = {
      chat_id: opts.toChatId,
      from_chat_id: opts.fromChatId,
      message_id: opts.messageId,
    };
    if (opts.caption != null && opts.caption !== "") {
      body.caption = opts.caption.slice(0, 1024);
    }
    const res = await fetch(
      `https://api.telegram.org/bot${token}/copyMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: { message_id?: number };
      description?: string;
    };
    if (!res.ok || !data.ok) {
      console.error(
        "[copyTelegramMessage]",
        opts.bot ?? "customer",
        res.status,
        data.description?.slice(0, 300) ?? "",
      );
      return { ok: false };
    }
    return { ok: true, messageId: data.result?.message_id };
  } catch (e) {
    console.error("[copyTelegramMessage]", e);
    return { ok: false };
  }
}

export function getPlatformSupportTelegramChatId(): string | null {
  const id = process.env.PLATFORM_SUPPORT_TELEGRAM_CHAT_ID?.trim();
  return id || null;
}

/** Telegram Mini App — ilova (faqat HTTPS public URL) */
export function getTelegramWebAppUrl(slug: string): string {
  const base = getConfiguredAppUrl();
  if (!base.startsWith("https://")) return "";
  return `${base}/c/${slug}/app?src=tg`;
}

export function formatOrderTelegramMessage(opts: {
  cafeName: string;
  orderNumber: number;
  tableNumber?: number;
  type?: string;
  totalSom: number;
  customerPhone?: string;
  customerAddress?: string;
}): string {
  const lines = [
    `🆕 <b>Yangi buyurtma</b>`,
    `🏪 ${opts.cafeName}`,
    `📋 #${String(opts.orderNumber).padStart(3, "0")}`,
  ];
  if (opts.tableNumber) lines.push(`🪑 Stol ${opts.tableNumber}`);
  if (opts.type === "DELIVERY") lines.push(`🚗 Yetkazish`);
  if (opts.type === "TAKEAWAY") lines.push(`🥡 Olib ketish`);
  lines.push(`💰 ${opts.totalSom.toLocaleString("uz-UZ")} so'm`);
  if (opts.customerPhone) lines.push(`📞 ${opts.customerPhone}`);
  if (opts.customerAddress) lines.push(`📍 ${opts.customerAddress}`);
  return lines.join("\n");
}

export function formatWaiterCallTelegramMessage(opts: {
  cafeName: string;
  tableNumber: number;
}): string {
  return [
    `🔔 <b>Ofitsiant chaqirildi!</b>`,
    `🏪 ${opts.cafeName}`,
    `🪑 Stol ${opts.tableNumber}`,
  ].join("\n");
}

const botUsernameCache: Partial<
  Record<TelegramBotRole, { value: string | null; at: number }>
> = {};
const BOT_CACHE_MS = 60 * 60 * 1000;

export async function getTelegramBotUsername(
  role: TelegramBotRole = "customer",
): Promise<string | null> {
  const cached = botUsernameCache[role];
  if (cached && Date.now() - cached.at < BOT_CACHE_MS) {
    return cached.value;
  }

  const envKey =
    role === "support"
      ? process.env.TELEGRAM_SUPPORT_BOT_USERNAME
      : process.env.TELEGRAM_BOT_USERNAME;
  const fromEnv = envKey?.replace(/^@/, "").trim();
  if (fromEnv) {
    botUsernameCache[role] = { value: fromEnv, at: Date.now() };
    return fromEnv;
  }

  // Support username yo'q, lekin alohida token ham yo'q — customer username
  if (role === "support" && !hasSeparateSupportBot()) {
    const shared = await getTelegramBotUsername("customer");
    botUsernameCache.support = { value: shared, at: Date.now() };
    return shared;
  }

  const token = getTelegramBotToken(role);
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = (await res.json()) as {
      ok?: boolean;
      result?: { username?: string };
    };
    const value = data.ok ? (data.result?.username ?? null) : null;
    botUsernameCache[role] = { value, at: Date.now() };
    return value;
  } catch {
    return null;
  }
}

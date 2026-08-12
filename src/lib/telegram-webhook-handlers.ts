import { fulfillTelegramPasswordReset } from "@/lib/password-reset";
import {
  activateAdminPhotoPendingFromStart,
  fulfillOwnerTelegramLink,
  handleBotMediaMessage,
  handleBotTextMessage,
  handleOwnerCallback,
  sendWelcome,
  findOwnerByChatId,
} from "@/lib/telegram-support-bot";
import {
  handleCustomerCallback,
  sendCustomerBareStart,
  sendCustomerCafeWelcome,
  sendCustomerTextHint,
} from "@/lib/telegram-customer-bot";
import {
  getTelegramBotToken,
  hasSeparateSupportBot,
  sendTelegramMessage,
  type TelegramBotRole,
} from "@/lib/telegram";

export type TgUpdate = {
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    caption?: string;
    photo?: Array<{ file_id: string; width?: number; height?: number }>;
    document?: { file_id: string; mime_type?: string };
    reply_to_message?: { message_id: number };
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number } };
  };
};

async function answerCallback(
  role: TelegramBotRole,
  callbackQueryId: string,
) {
  const token = getTelegramBotToken(role);
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId }),
    });
  } catch {
    /* ignore */
  }
}

function platformChatId() {
  return process.env.PLATFORM_SUPPORT_TELEGRAM_CHAT_ID?.trim() || null;
}

function isPlatformAdmin(chatId: string) {
  const platform = platformChatId();
  return Boolean(platform && chatId === platform);
}

/** Mijoz / delivery bot */
export async function handleCustomerBotUpdate(update: TgUpdate) {
  const role: TelegramBotRole = "customer";

  if (update.callback_query?.data && update.callback_query.message?.chat) {
    const chatId = String(update.callback_query.message.chat.id);
    await answerCallback(role, update.callback_query.id);
    const data = update.callback_query.data;
    if (await handleCustomerCallback(chatId, data)) {
      return;
    }
    // Alohida support bot bo'lmasa — egasi callbacklari shu yerdan
    if (!hasSeparateSupportBot()) {
      await handleOwnerCallback(chatId, data);
    }
    return;
  }

  const message = update.message;
  if (!message) return;

  const chatId = String(message.chat.id);
  const text = message.text?.trim() ?? "";

  if (text.startsWith("/start")) {
    const payload = text.split(/\s+/)[1] ?? "";

    // Bitta bot rejimida support deep-linklar shu webhookda
    if (!hasSeparateSupportBot()) {
      if (await handleSupportStartPayload(chatId, payload, "customer")) {
        return;
      }
    } else if (
      payload === "support" ||
      payload === "owner" ||
      payload.startsWith("link_") ||
      payload.startsWith("rst_") ||
      payload.startsWith("aphoto_") ||
      payload === "help_reset"
    ) {
      const supportUser = process.env.TELEGRAM_SUPPORT_BOT_USERNAME?.replace(
        /^@/,
        "",
      );
      await sendTelegramMessage(
        chatId,
        supportUser
          ? `Bu — buyurtma boti. Support uchun @${supportUser} ga yozing.`
          : "Bu — buyurtma boti. Support uchun alohida support botdan foydalaning.",
        { bot: "customer" },
      );
      return;
    }

    if (payload.startsWith("cafe_")) {
      await sendCustomerCafeWelcome(chatId, payload.slice(5));
      return;
    }

    await sendCustomerBareStart(chatId);
    return;
  }

  if (!hasSeparateSupportBot()) {
    await handleSupportMessageBody(message, chatId, text);
    return;
  }

  // Faqat mijoz bot — egasi oqimi yo'q
  const hasPhoto = Array.isArray(message.photo) && message.photo.length > 0;
  const doc = message.document;
  const isImageDoc = !!doc?.mime_type?.startsWith("image/");
  if (hasPhoto || isImageDoc || text) {
    await sendCustomerTextHint(chatId);
  }
}

/** Support / egasi bot */
export async function handleSupportBotUpdate(update: TgUpdate) {
  const role: TelegramBotRole = "support";

  if (update.callback_query?.data && update.callback_query.message?.chat) {
    const chatId = String(update.callback_query.message.chat.id);
    await answerCallback(role, update.callback_query.id);
    const data = update.callback_query.data;
    // Mijoz callbacklari support botda ishlamasin
    if (data.startsWith("cust_")) {
      const customer = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
      await sendTelegramMessage(
        chatId,
        customer
          ? `Buyurtma uchun @${customer} botini oching.`
          : "Buyurtma uchun delivery / mijoz botidan foydalaning.",
        { bot: "support" },
      );
      return;
    }
    await handleOwnerCallback(chatId, data);
    return;
  }

  const message = update.message;
  if (!message) return;

  const chatId = String(message.chat.id);
  const text = message.text?.trim() ?? "";

  if (text.startsWith("/start")) {
    const payload = text.split(/\s+/)[1] ?? "";

    if (payload.startsWith("cafe_")) {
      const customer = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
      await sendTelegramMessage(
        chatId,
        customer
          ? `Bu — support bot. Buyurtma uchun @${customer} ni oching yoki kafe saytidagi Telegram tugmasini bosing.`
          : "Bu — support bot. Buyurtma uchun mijoz (delivery) botidan foydalaning.",
        { bot: "support" },
      );
      return;
    }

    if (await handleSupportStartPayload(chatId, payload, "support")) {
      return;
    }

    // Oddiy /start — support welcome (delivery emas!)
    await sendWelcome(chatId);
    return;
  }

  await handleSupportMessageBody(message, chatId, text);
}

async function handleSupportStartPayload(
  chatId: string,
  payload: string,
  replyBot: TelegramBotRole,
): Promise<boolean> {
  if (payload.startsWith("rst_")) {
    const linkId = payload.slice(4);
    if (linkId.length >= 16) {
      await fulfillTelegramPasswordReset(linkId, chatId);
    } else {
      await sendTelegramMessage(
        chatId,
        "Havola noto'g'ri. Saytdagi «Kodni qayta olish (Telegram)» dan qayta bosing.",
        { bot: replyBot },
      );
    }
    return true;
  }

  if (payload.startsWith("link_")) {
    const linkId = payload.slice(5);
    if (linkId.length >= 16) {
      await fulfillOwnerTelegramLink(linkId, chatId);
    } else {
      await sendTelegramMessage(chatId, "Profil ulash havolasi noto'g'ri.", {
        bot: replyBot,
      });
    }
    return true;
  }

  if (payload === "help_reset") {
    await sendTelegramMessage(
      chatId,
      "Parol tiklash: saytda email → «Kodni qayta olish (Telegram)».",
      { bot: replyBot },
    );
    return true;
  }

  if (payload.startsWith("aphoto_")) {
    const cafeId = payload.slice("aphoto_".length);
    if (cafeId.length >= 8) {
      await activateAdminPhotoPendingFromStart(chatId, cafeId);
    }
    return true;
  }

  if (payload === "support" || payload === "owner") {
    await sendWelcome(chatId);
    return true;
  }

  return false;
}

async function handleSupportMessageBody(
  message: NonNullable<TgUpdate["message"]>,
  chatId: string,
  text: string,
) {
  const hasPhoto = Array.isArray(message.photo) && message.photo.length > 0;
  const doc = message.document;
  const isImageDoc = !!doc?.mime_type?.startsWith("image/");

  if (hasPhoto || isImageDoc) {
    const linked = await findOwnerByChatId(chatId);
    if (!linked?.cafe && !isPlatformAdmin(chatId)) {
      // Alohida support botda — mehmon ham skrinshot yuborishi mumkin (support oqimi)
      if (hasSeparateSupportBot()) {
        await handleBotMediaMessage({
          chatId,
          messageId: message.message_id,
          caption: message.caption,
          replyToMessageId: message.reply_to_message?.message_id,
        });
        return;
      }
      await sendCustomerTextHint(chatId);
      return;
    }
    await handleBotMediaMessage({
      chatId,
      messageId: message.message_id,
      caption: message.caption,
      replyToMessageId: message.reply_to_message?.message_id,
    });
    return;
  }

  if (text) {
    if (text === "/menu") {
      await sendWelcome(chatId);
      return;
    }
    const linked = await findOwnerByChatId(chatId);
    if (linked?.cafe || isPlatformAdmin(chatId) || hasSeparateSupportBot()) {
      await handleBotTextMessage(chatId, text);
    } else {
      await sendCustomerTextHint(chatId);
    }
  }
}

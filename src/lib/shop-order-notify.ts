import "server-only";

import { getConfiguredAppUrl, PRODUCTION_APP_URL } from "@/lib/app-url";
import {
  getPlatformSupportTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram";
import { formatPrice } from "@/lib/utils";

export async function notifyPlatformShopOrder(opts: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerNote?: string | null;
  total: number;
  items: Array<{ productName: string; qty: number; unitPrice: number }>;
}) {
  const chatId = getPlatformSupportTelegramChatId();
  if (!chatId) {
    console.warn(
      "[shop-order] PLATFORM_SUPPORT_TELEGRAM_CHAT_ID yo‘q — Telegram xabar yuborilmadi",
    );
    return { ok: false as const, reason: "no_chat" as const };
  }

  const base = getConfiguredAppUrl() || PRODUCTION_APP_URL;
  const panelUrl = `${base.replace(/\/$/, "")}/platform/shopping/orders`;
  const lines = [
    `🛒 <b>Yangi Shopping buyurtma</b>`,
    `👤 ${escapeHtml(opts.customerName)}`,
    `📞 ${escapeHtml(opts.customerPhone)}`,
    `💰 ${formatPrice(opts.total)}`,
    ``,
    ...opts.items.map(
      (i) =>
        `• ${escapeHtml(i.productName)} × ${i.qty} — ${formatPrice(i.unitPrice * i.qty)}`,
    ),
  ];
  if (opts.customerNote?.trim()) {
    lines.push(``, `📝 ${escapeHtml(opts.customerNote.trim())}`);
  }
  lines.push(``, `Kod: <code>${escapeHtml(opts.orderId.slice(-8))}</code>`);

  const result = await sendTelegramMessage(chatId, lines.join("\n"), {
    bot: "support",
    inlineKeyboard: [[{ text: "Buyurtmalarni ochish", url: panelUrl }]],
  });

  return { ok: result.ok, reason: result.ok ? ("sent" as const) : ("fail" as const) };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

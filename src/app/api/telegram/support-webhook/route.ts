import { NextRequest, NextResponse } from "next/server";
import {
  handleSupportBotUpdate,
  type TgUpdate,
} from "@/lib/telegram-webhook-handlers";
import { getTelegramBotToken } from "@/lib/telegram";

/** Support / egasi bot webhook (alohida token) */
export async function POST(request: NextRequest) {
  const secret =
    process.env.TELEGRAM_SUPPORT_WEBHOOK_SECRET ||
    process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!getTelegramBotToken("support")) {
    return NextResponse.json({ ok: true });
  }

  try {
    const update = (await request.json()) as TgUpdate;
    await handleSupportBotUpdate(update);
  } catch (error) {
    console.error("Telegram support webhook:", error);
  }
  return NextResponse.json({ ok: true });
}

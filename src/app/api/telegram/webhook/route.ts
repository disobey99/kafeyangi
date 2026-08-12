import { NextRequest, NextResponse } from "next/server";
import {
  handleCustomerBotUpdate,
  type TgUpdate,
} from "@/lib/telegram-webhook-handlers";
import { getTelegramBotToken } from "@/lib/telegram";

/** Mijoz / delivery bot webhook */
export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!getTelegramBotToken("customer")) {
    return NextResponse.json({ ok: true });
  }

  try {
    const update = (await request.json()) as TgUpdate;
    await handleCustomerBotUpdate(update);
  } catch (error) {
    console.error("Telegram customer webhook:", error);
  }
  return NextResponse.json({ ok: true });
}

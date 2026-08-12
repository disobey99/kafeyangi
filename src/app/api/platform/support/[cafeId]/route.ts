import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import { markSupportNotificationsRead } from "@/lib/app-notifications";
import {
  createSupportMessage,
  getOrCreateOpenConversation,
  listSupportMessages,
  mapMessageForPlatformView,
} from "@/lib/support-chat";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const access = await requirePlatformApiPermission("menu.support");
  if (!access.ok) return access.response;
  const { cafeId } = await params;
  const conversationId = await getOrCreateOpenConversation(cafeId);
  await markSupportNotificationsRead(access.session.userId, cafeId);
  const messages = await listSupportMessages(conversationId);

  return NextResponse.json({
    conversationId,
    messages: messages.map(mapMessageForPlatformView),
  });
}

const postSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const access = await requirePlatformApiPermission("action.support.reply");
    if (!access.ok) return access.response;

    const { cafeId } = await params;
    const { text } = postSchema.parse(await request.json());
    const conversationId = await getOrCreateOpenConversation(cafeId);

    const message = await createSupportMessage({
      conversationId,
      cafeId,
      senderType: "PLATFORM",
      senderUserId: access.session.userId,
      senderName: access.session.name,
      text,
    });

    const { notifyOwnerTelegramSupportReply } = await import(
      "@/lib/telegram-support-bot"
    );
    await notifyOwnerTelegramSupportReply({
      cafeId,
      text,
      senderName: access.session.name,
    }).catch(() => {});

    return NextResponse.json({
      message: mapMessageForPlatformView(message),
    });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

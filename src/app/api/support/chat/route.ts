import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCafeManager } from "@/lib/cafe-access";
import { markSupportNotificationsRead } from "@/lib/app-notifications";
import {
  createSupportMessage,
  getOrCreateOpenConversation,
  listSupportMessages,
  mapMessageForCafeView,
  markSupportReadByCafe,
} from "@/lib/support-chat";

export async function GET(request: NextRequest) {
  const cafeId = request.nextUrl.searchParams.get("cafeId");
  if (!cafeId) {
    return NextResponse.json({ error: "cafeId kerak" }, { status: 400 });
  }

  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const conversationId = await getOrCreateOpenConversation(cafeId);
  const messages = await listSupportMessages(conversationId);
  await markSupportReadByCafe(conversationId);
  await markSupportNotificationsRead(access.session.userId, cafeId);
  const refreshed = await listSupportMessages(conversationId);

  return NextResponse.json({
    conversationId,
    messages: refreshed.map(mapMessageForCafeView),
  });
}

const postSchema = z.object({
  cafeId: z.string().min(1),
  text: z.string().trim().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const body = postSchema.parse(await request.json());
    const access = await requireCafeManager(body.cafeId);
    if (!access.ok) return access.response;

    const conversationId = await getOrCreateOpenConversation(body.cafeId);
    const message = await createSupportMessage({
      conversationId,
      cafeId: body.cafeId,
      senderType: "CAFE",
      senderUserId: access.session.userId,
      senderName: access.session.name,
      text: body.text,
    });

    return NextResponse.json({
      message: mapMessageForCafeView(message),
    });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

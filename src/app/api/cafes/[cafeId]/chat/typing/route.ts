import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCafeStaff } from "@/lib/cafe-access";
import { publishCafeEvent } from "@/lib/realtime";
import {
  clearChatTyping,
  listChatOnline,
  listChatTyping,
  setChatTyping,
  touchChatPresence,
} from "@/lib/chat-presence";

const schema = z.object({
  typing: z.boolean().default(true),
});

/** Yozmoqda… + online presence */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  const body = schema.parse(await request.json().catch(() => ({ typing: true })));
  const { userId, name } = access.session;

  touchChatPresence(cafeId, userId, name);
  if (body.typing) setChatTyping(cafeId, userId, name);
  else clearChatTyping(cafeId, userId);

  const online = listChatOnline(cafeId);
  const typing = listChatTyping(cafeId);

  publishCafeEvent(cafeId, {
    type: "ops.chat.typing",
    payload: { typing, online, fromUserId: userId },
  });
  publishCafeEvent(cafeId, {
    type: "ops.chat.presence",
    payload: { online },
  });

  return NextResponse.json({ online, typing });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  touchChatPresence(cafeId, access.session.userId, access.session.name);
  return NextResponse.json({
    online: listChatOnline(cafeId),
    typing: listChatTyping(cafeId, access.session.userId),
  });
}

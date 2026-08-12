import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { publishCafeEvent } from "@/lib/realtime";
import { touchChatPresence } from "@/lib/chat-presence";

function cuidLike() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

const schema = z.object({
  messageIds: z.array(z.string().min(1)).min(1).max(100),
});

/** Xabarlarni o'qilgan deb belgilash */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  const { messageIds } = schema.parse(await request.json());
  const userId = access.session.userId;
  const userName = access.session.name;

  touchChatPresence(cafeId, userId, userName);

  const marked: string[] = [];
  for (const messageId of messageIds) {
    const owned = await prisma.$queryRaw<Array<{ id: string; senderId: string }>>`
      SELECT id, senderId FROM ChatMessage
      WHERE id = ${messageId} AND cafeId = ${cafeId}
      LIMIT 1
    `;
    if (!owned[0]) continue;

    await prisma.$executeRaw`
      INSERT OR IGNORE INTO ChatMessageRead (id, messageId, userId, userName, readAt)
      VALUES (${cuidLike()}, ${messageId}, ${userId}, ${userName}, CURRENT_TIMESTAMP)
    `;
    marked.push(messageId);
  }

  if (marked.length > 0) {
    const reads = await prisma.$queryRawUnsafe<
      Array<{ messageId: string; userId: string; userName: string; readAt: string | Date }>
    >(
      `SELECT messageId, userId, userName, readAt FROM ChatMessageRead WHERE messageId IN (${marked.map(() => "?").join(",")}) ORDER BY readAt ASC`,
      ...marked,
    );

    const byMsg: Record<
      string,
      Array<{ userId: string; userName: string; readAt: string | Date }>
    > = {};
    for (const r of reads) {
      (byMsg[r.messageId] ??= []).push({
        userId: r.userId,
        userName: r.userName,
        readAt: r.readAt,
      });
    }

    publishCafeEvent(cafeId, {
      type: "ops.chat.read",
      payload: { byMsg, readerId: userId, readerName: userName },
    });
  }

  return NextResponse.json({ ok: true, marked });
}

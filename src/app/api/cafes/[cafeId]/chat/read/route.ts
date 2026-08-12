import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { publishCafeEvent } from "@/lib/realtime";
import { touchChatPresence } from "@/lib/chat-presence";

const schema = z.object({
  messageIds: z.array(z.string().min(1)).min(1).max(100),
});

/** Xabarlarni o'qilgan deb belgilash — Postgres / SQLite mos */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeStaff(cafeId);
    if (!access.ok) return access.response;

    const { messageIds } = schema.parse(await request.json());
    const userId = access.session.userId;
    const userName = access.session.name;

    touchChatPresence(cafeId, userId, userName);

    const owned = await prisma.chatMessage.findMany({
      where: { cafeId, id: { in: messageIds } },
      select: { id: true },
    });
    const ownedIds = owned.map((m) => m.id);
    if (ownedIds.length === 0) {
      return NextResponse.json({ ok: true, marked: [] });
    }

    await prisma.chatMessageRead.createMany({
      data: ownedIds.map((messageId) => ({
        messageId,
        userId,
        userName,
      })),
      skipDuplicates: true,
    });

    const reads = await prisma.chatMessageRead.findMany({
      where: { messageId: { in: ownedIds } },
      orderBy: { readAt: "asc" },
      select: {
        messageId: true,
        userId: true,
        userName: true,
        readAt: true,
      },
    });

    const byMsg: Record<
      string,
      Array<{ userId: string; userName: string; readAt: Date }>
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

    return NextResponse.json({ ok: true, marked: ownedIds });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Noto'g'ri ma'lumot" },
        { status: 400 },
      );
    }
    console.error("chat read POST:", err);
    return NextResponse.json({ error: "O'qilgan deb belgilash xatosi" }, { status: 500 });
  }
}

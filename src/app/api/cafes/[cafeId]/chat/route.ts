import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { publishCafeEvent } from "@/lib/realtime";
import {
  listChatOnline,
  listChatTyping,
  touchChatPresence,
} from "@/lib/chat-presence";

type MsgRow = {
  id: string;
  cafeId: string;
  senderId: string;
  senderName: string;
  text: string;
  replyToId: string | null;
  createdAt: string | Date;
  replySenderName: string | null;
  replyText: string | null;
};

type ReadRow = {
  messageId: string;
  userId: string;
  userName: string;
  readAt: string | Date;
};

function cuidLike() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

async function loadMessages(cafeId: string) {
  const rows = await prisma.$queryRaw<MsgRow[]>`
    SELECT
      m.id, m.cafeId, m.senderId, m.senderName, m.text, m.replyToId, m.createdAt,
      r.senderName AS replySenderName,
      r.text AS replyText
    FROM ChatMessage m
    LEFT JOIN ChatMessage r ON r.id = m.replyToId
    WHERE m.cafeId = ${cafeId}
    ORDER BY m.createdAt DESC
    LIMIT 100
  `;
  const messages = rows.reverse();
  if (messages.length === 0) return [];

  const ids = messages.map((m) => m.id);
  const placeholders = ids.map(() => "?").join(",");
  const reads = await prisma.$queryRawUnsafe<ReadRow[]>(
    `SELECT messageId, userId, userName, readAt FROM ChatMessageRead WHERE messageId IN (${placeholders}) ORDER BY readAt ASC`,
    ...ids,
  );

  const byMsg = new Map<string, ReadRow[]>();
  for (const r of reads) {
    const list = byMsg.get(r.messageId) ?? [];
    list.push(r);
    byMsg.set(r.messageId, list);
  }

  return messages.map((m) => {
    const msgReads = byMsg.get(m.id) ?? [];
    return {
      id: m.id,
      cafeId: m.cafeId,
      senderId: m.senderId,
      senderName: m.senderName,
      text: m.text,
      replyToId: m.replyToId,
      createdAt: m.createdAt,
      replyTo: m.replyToId
        ? {
            id: m.replyToId,
            senderName: m.replySenderName ?? "Xodim",
            text: m.replyText ?? "",
          }
        : null,
      reads: msgReads.map((r) => ({
        userId: r.userId,
        userName: r.userName,
        readAt: r.readAt,
      })),
      readCount: msgReads.length,
    };
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  touchChatPresence(cafeId, access.session.userId, access.session.name);
  const messages = await loadMessages(cafeId);
  const online = listChatOnline(cafeId);
  const typing = listChatTyping(cafeId, access.session.userId);

  publishCafeEvent(cafeId, {
    type: "ops.chat.presence",
    payload: { online },
  });

  return NextResponse.json({ messages, online, typing });
}

const schema = z.object({
  text: z.string().min(1).max(1000),
  replyToId: z.string().min(1).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  const input = schema.parse(await request.json());
  const id = cuidLike();
  const replyToId = input.replyToId ?? null;

  if (replyToId) {
    const parent = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM ChatMessage WHERE id = ${replyToId} AND cafeId = ${cafeId} LIMIT 1
    `;
    if (!parent[0]) {
      return NextResponse.json({ error: "Javob xabari topilmadi" }, { status: 400 });
    }
  }

  await prisma.$executeRaw`
    INSERT INTO ChatMessage (id, cafeId, senderId, senderName, text, replyToId, createdAt)
    VALUES (
      ${id},
      ${cafeId},
      ${access.session.userId},
      ${access.session.name},
      ${input.text},
      ${replyToId},
      CURRENT_TIMESTAMP
    )
  `;

  // Sender o'z xabarini o'qigan hisoblanadi
  await prisma.$executeRaw`
    INSERT OR IGNORE INTO ChatMessageRead (id, messageId, userId, userName, readAt)
    VALUES (${cuidLike()}, ${id}, ${access.session.userId}, ${access.session.name}, CURRENT_TIMESTAMP)
  `;

  const messages = await loadMessages(cafeId);
  const message = messages.find((m) => m.id === id) ?? {
    id,
    cafeId,
    senderId: access.session.userId,
    senderName: access.session.name,
    text: input.text,
    replyToId,
    createdAt: new Date().toISOString(),
    replyTo: null,
    reads: [],
    readCount: 1,
  };

  touchChatPresence(cafeId, access.session.userId, access.session.name);
  publishCafeEvent(cafeId, { type: "ops.chat.created", payload: { message } });

  return NextResponse.json({ message });
}

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

async function loadMessages(cafeId: string) {
  const rows = await prisma.chatMessage.findMany({
    where: { cafeId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      replyTo: { select: { id: true, senderName: true, text: true } },
      reads: {
        orderBy: { readAt: "asc" },
        select: { userId: true, userName: true, readAt: true },
      },
    },
  });

  return rows.reverse().map((m) => ({
    id: m.id,
    cafeId: m.cafeId,
    senderId: m.senderId,
    senderName: m.senderName,
    text: m.text,
    replyToId: m.replyToId,
    createdAt: m.createdAt,
    replyTo: m.replyTo
      ? {
          id: m.replyTo.id,
          senderName: m.replyTo.senderName,
          text: m.replyTo.text,
        }
      : null,
    reads: m.reads.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      readAt: r.readAt,
    })),
    readCount: m.reads.length,
  }));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
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
  } catch (err) {
    console.error("chat GET:", err);
    return NextResponse.json(
      { error: "Chat yuklanmadi. Qayta kiring yoki sahifani yangilang." },
      { status: 500 },
    );
  }
}

const schema = z.object({
  text: z.string().min(1).max(1000),
  replyToId: z.string().min(1).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeStaff(cafeId);
    if (!access.ok) return access.response;

    const input = schema.parse(await request.json());
    const replyToId = input.replyToId ?? null;

    if (replyToId) {
      const parent = await prisma.chatMessage.findFirst({
        where: { id: replyToId, cafeId },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Javob xabari topilmadi" },
          { status: 400 },
        );
      }
    }

    const created = await prisma.chatMessage.create({
      data: {
        cafeId,
        senderId: access.session.userId,
        senderName: access.session.name,
        text: input.text.trim(),
        replyToId,
        reads: {
          create: {
            userId: access.session.userId,
            userName: access.session.name,
          },
        },
      },
      include: {
        replyTo: { select: { id: true, senderName: true, text: true } },
        reads: {
          select: { userId: true, userName: true, readAt: true },
        },
      },
    });

    const message = {
      id: created.id,
      cafeId: created.cafeId,
      senderId: created.senderId,
      senderName: created.senderName,
      text: created.text,
      replyToId: created.replyToId,
      createdAt: created.createdAt,
      replyTo: created.replyTo
        ? {
            id: created.replyTo.id,
            senderName: created.replyTo.senderName,
            text: created.replyTo.text,
          }
        : null,
      reads: created.reads.map((r) => ({
        userId: r.userId,
        userName: r.userName,
        readAt: r.readAt,
      })),
      readCount: created.reads.length,
    };

    touchChatPresence(cafeId, access.session.userId, access.session.name);
    publishCafeEvent(cafeId, {
      type: "ops.chat.created",
      payload: { message },
    });

    return NextResponse.json({ message });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Noto'g'ri ma'lumot" },
        { status: 400 },
      );
    }
    console.error("chat POST:", err);
    return NextResponse.json(
      { error: "Xabar yuborilmadi. Qayta kiring yoki sahifani yangilang." },
      { status: 500 },
    );
  }
}

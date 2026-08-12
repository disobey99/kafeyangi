import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createOwnerTelegramLink } from "@/lib/telegram-support-bot";
import { prisma } from "@/lib/prisma";

async function getTelegramChatId(userId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ telegramChatId: string | null }>>`
      SELECT telegramChatId FROM User WHERE id = ${userId} LIMIT 1
    `;
    return rows[0]?.telegramChatId ?? null;
  } catch {
    return null;
  }
}

/** Egasi — Telegram profilni ulash havolasi */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Kirish kerak" }, { status: 401 });
    }

    const result = await createOwnerTelegramLink(session.userId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const chatId = await getTelegramChatId(session.userId);

    return NextResponse.json({
      ok: true,
      telegramUrl: result.telegramUrl,
      expiresAt: result.expiresAt,
      linked: !!chatId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ulanish xatosi";
    console.error("[telegram-link POST]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Kirish kerak" }, { status: 401 });
    }
    const chatId = await getTelegramChatId(session.userId);
    return NextResponse.json({
      linked: !!chatId,
    });
  } catch (e) {
    console.error("[telegram-link GET]", e);
    return NextResponse.json({ error: "Holat olinmadi" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Kirish kerak" }, { status: 401 });
    }
    await prisma.$executeRaw`
      UPDATE User SET telegramChatId = NULL WHERE id = ${session.userId}
    `;
    return NextResponse.json({ ok: true, linked: false });
  } catch (e) {
    console.error("[telegram-link DELETE]", e);
    return NextResponse.json({ error: "Uzib bo‘lmadi" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const schema = z.object({
  currentPassword: z.string().min(1).max(120),
  newPassword: z.string().min(6).max(120),
});

/** Kirgan foydalanuvchi (kafe egasi/xodim) o‘z parolini o‘zgartiradi */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    if (body.currentPassword === body.newPassword) {
      return NextResponse.json(
        { error: "Yangi parol eski paroldan farq qilishi kerak" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    }

    const ok = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Joriy parol noto‘g‘ri" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const currentToken = cookieStore.get("kafe_session")?.value;

    const passwordHash = await bcrypt.hash(body.newPassword, 10);
    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, passwordChangedAt: now },
      }),
      prisma.session.deleteMany({
        where: currentToken
          ? { userId: user.id, NOT: { token: currentToken } }
          : { userId: user.id },
      }),
    ]);

    return NextResponse.json({ ok: true, message: "Parol yangilandi" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Parol kamida 6 belgi bo‘lsin" },
        { status: 400 },
      );
    }
    console.error("[auth/password]", err);
    return NextResponse.json({ error: "Xatolik" }, { status: 500 });
  }
}

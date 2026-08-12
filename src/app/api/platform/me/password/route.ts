import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, isPlatformAccess } from "@/lib/auth";

const schema = z.object({
  /** Bo'sh bo'lsa — allaqachon kirgan platforma sessiyasi yetarli */
  currentPassword: z.string().max(120).optional().nullable(),
  newPassword: z.string().min(6).max(120),
  skipCurrent: z.boolean().optional(),
});

/** Platforma admin / xodim o'z parolini o'zgartiradi */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isPlatformAccess(session)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  try {
    const body = schema.parse(await request.json());
    const current = body.currentPassword?.trim() ?? "";
    const skipCurrent = Boolean(body.skipCurrent) || !current;

    if (current && current === body.newPassword) {
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

    // Kirgan holatda joriy parolsiz ham yangilash mumkin (sessiya = kimlik)
    if (!skipCurrent) {
      const ok = await bcrypt.compare(current, user.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: "Joriy parol noto'g'ri" }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({
      ok: true,
      password: body.newPassword,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Parol kamida 6 belgi bo'lsin" }, { status: 400 });
    }
    console.error("[platform/me/password]", err);
    return NextResponse.json({ error: "Xatolik" }, { status: 500 });
  }
}

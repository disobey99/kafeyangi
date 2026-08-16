import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformApiPermission } from "@/lib/session-guard";

const schema = z.object({
  password: z.string().min(6).max(120),
});

/** Super admin / ruxsatli xodim: kafe egasiga yangi parol o'rnatadi */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const access = await requirePlatformApiPermission("action.cafes.manage");
  if (!access.ok) return access.response;

  try {
    const { cafeId } = await params;
    const body = schema.parse(await request.json());

    const cafe = await prisma.cafe.findUnique({
      where: { id: cafeId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        owner: { select: { id: true, email: true, name: true, globalRole: true } },
      },
    });

    if (!cafe) {
      return NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 });
    }

    if (
      cafe.owner.globalRole === "SUPER_ADMIN" ||
      (cafe.owner.globalRole as string) === "PLATFORM_STAFF"
    ) {
      return NextResponse.json(
        { error: "Platforma admin parolini bu yerdan o'zgartirib bo'lmaydi" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: cafe.ownerId },
        data: { passwordHash, passwordChangedAt: now },
      }),
      prisma.session.deleteMany({ where: { userId: cafe.ownerId } }),
      prisma.passwordResetToken.updateMany({
        where: { userId: cafe.ownerId, usedAt: null },
        data: { usedAt: now },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      owner: {
        id: cafe.owner.id,
        name: cafe.owner.name,
        email: cafe.owner.email,
      },
      cafeName: cafe.name,
      /** Faqat shu javobda — egaga aytish / nusxa olish uchun */
      password: body.password,
      message:
        "Yangi parol o‘rnatildi. Eski sessiyalar yopildi — egaga yangi kodni bering.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Parol kamida 6 belgi bo'lsin" }, { status: 400 });
    }
    console.error("[platform/cafes/owner-password]", err);
    return NextResponse.json({ error: "Xatolik" }, { status: 500 });
  }
}

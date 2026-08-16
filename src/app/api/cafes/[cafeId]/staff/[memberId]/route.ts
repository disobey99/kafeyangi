import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CafeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { replaceLocalUpload } from "@/lib/uploads";

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["MANAGER", "CASHIER", "WAITER", "KITCHEN", "COURIER", "WAREHOUSE"]).optional(),
  salarySom: z.number().min(0).optional(),
  avatarUrl: z
    .union([z.string().max(800), z.literal(""), z.null()])
    .optional()
    .refine(
      (v) =>
        v === undefined ||
        v === null ||
        v === "" ||
        v.startsWith("/uploads/") ||
        /^https?:\/\//i.test(v),
      { message: "Rasm URL yoki /uploads/..." },
    ),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(6).optional().or(z.literal("")),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string; memberId: string }> }
) {
  try {
    const { cafeId, memberId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;

    const member = await prisma.cafeMember.findFirst({
      where: { id: memberId, cafeId },
      include: { user: true },
    });

    if (!member) {
      return NextResponse.json({ error: "Xodim topilmadi" }, { status: 404 });
    }

    const data = updateSchema.parse(await request.json());

    if (member.role === CafeRole.OWNER) {
      // Egasi (Owner) uchun isActive yoki role o'zgartirishni taqiqlaymiz
      if (data.isActive === false) {
        return NextResponse.json({ error: "Egasini o'chirib bo'lmaydi" }, { status: 400 });
      }
      if (data.role) {
        return NextResponse.json({ error: "Egasi rolini o'zgartirib bo'lmaydi" }, { status: 400 });
      }
    }

    let passwordHash = undefined;
    if (data.password) {
      const bcrypt = await import("bcryptjs");
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    await prisma.$transaction([
      prisma.cafeMember.update({
        where: { id: memberId },
        data: {
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.role && { role: data.role as CafeRole }),
          ...(data.salarySom !== undefined && { salary: Math.round(data.salarySom * 100) }),
        },
      }),
      prisma.user.update({
        where: { id: member.userId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.email && { email: data.email }),
          ...(data.phone !== undefined && { phone: data.phone || null }),
          ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl || null }),
          ...(passwordHash && { passwordHash }),
        },
      }),
    ]);

    if (data.avatarUrl !== undefined) {
      await replaceLocalUpload(
        member.user.avatarUrl,
        data.avatarUrl || null,
        cafeId,
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

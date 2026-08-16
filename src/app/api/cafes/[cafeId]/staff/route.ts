import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { CafeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { checkPlanLimit } from "@/lib/plan-access";
import { getCafeStaffRatingMap } from "@/lib/staff-ratings";

const addStaffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(["MANAGER", "CASHIER", "WAITER", "KITCHEN", "COURIER", "WAREHOUSE"]),
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
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const [members, ratings] = await Promise.all([
    prisma.cafeMember.findMany({
      where: { cafeId, isActive: true },
      select: {
        id: true,
        role: true,
        pinHash: true,
        pinResetRequired: true,
        salary: true,
        lastActiveAt: true,
        user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    getCafeStaffRatingMap(cafeId),
  ]);

  return NextResponse.json({
    members: members.map((m) => ({
      ...m,
      rating: ratings[m.user.id] ?? { avgScore: 0, count: 0 },
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;

    const body = addStaffSchema.parse(await request.json());

    const existingMember = await prisma.user.findUnique({
      where: { email: body.email },
      include: { memberships: { where: { cafeId } } },
    });

    if (existingMember?.memberships.some((m) => m.isActive)) {
      return NextResponse.json(
        { error: "Bu email allaqachon kafe xodimi" },
        { status: 400 }
      );
    }

    const limit = await checkPlanLimit(cafeId, "staff");
    if (!limit.ok) {
      return NextResponse.json({ error: limit.error }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    let userId: string;

    if (existingMember) {
      await prisma.user.update({
        where: { id: existingMember.id },
        data: {
          name: body.name,
          phone: body.phone,
          passwordHash,
          avatarUrl: body.avatarUrl || null,
        },
      });
      userId = existingMember.id;

      const inactive = existingMember.memberships.find((m) => !m.isActive);
      if (inactive) {
        await prisma.cafeMember.update({
          where: { id: inactive.id },
          data: {
            role: body.role as CafeRole,
            isActive: true,
            salary: body.salarySom ? Math.round(body.salarySom * 100) : 0,
          },
        });
        return NextResponse.json({ ok: true });
      }
    } else {
      const user = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone,
          passwordHash,
          avatarUrl: body.avatarUrl || null,
        },
      });
      userId = user.id;
    }

    await prisma.cafeMember.create({
      data: {
        cafeId,
        userId,
        role: body.role as CafeRole,
        salary: body.salarySom ? Math.round(body.salarySom * 100) : 0,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

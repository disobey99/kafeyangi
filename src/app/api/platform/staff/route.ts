import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, isSuperAdmin } from "@/lib/auth";
import {
  normalizePermissions,
  permissionsToJson,
  ROLE_PERMISSION_PRESETS,
} from "@/lib/platform-permissions";
import {
  listPlatformStaff,
} from "@/lib/platform-staff";
import {
  isPlatformStaffRole,
  type PlatformStaffRole,
} from "@/lib/platform-staff-shared";

const createSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "SUPPORT", "ANALYST"]),
  permissions: z.array(z.string()).optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional().nullable(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "SUPPORT", "ANALYST"]).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }
  return NextResponse.json({ staff: await listPlatformStaff() });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  try {
    const body = createSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return NextResponse.json({ error: "Bu email band" }, { status: 400 });
    }

    const role = body.role as PlatformStaffRole;
    const perms =
      body.permissions !== undefined
        ? normalizePermissions(body.permissions)
        : ROLE_PERMISSION_PRESETS[role];
    const permsJson = permissionsToJson(perms);

    const passwordHash = await bcrypt.hash(body.password, 10);
    const userId = crypto.randomUUID();

    await prisma.$executeRaw`
      INSERT INTO User (id, email, passwordHash, name, phone, globalRole, createdAt, updatedAt)
      VALUES (${userId}, ${body.email}, ${passwordHash}, ${body.name}, ${body.phone ?? null}, 'PLATFORM_STAFF', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    const staffId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO PlatformStaff (id, userId, role, permissions, isActive, createdAt, updatedAt)
      VALUES (${staffId}, ${userId}, ${role}, ${permsJson}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    return NextResponse.json({
      staff: {
        id: staffId,
        userId,
        role,
        permissions: perms,
        isActive: true,
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        createdAt: new Date().toISOString(),
      },
      password: body.password,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
    }
    console.error("platform staff create:", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  try {
    const body = patchSchema.parse(await request.json());

    const rows = await prisma.$queryRaw<
      Array<{ id: string; userId: string }>
    >`
      SELECT id, userId FROM PlatformStaff WHERE id = ${body.id} LIMIT 1
    `;
    const staff = rows[0];
    if (!staff) {
      return NextResponse.json({ error: "Xodim topilmadi" }, { status: 404 });
    }

    if (body.email) {
      const existing = await prisma.user.findFirst({
        where: {
          email: body.email,
          id: { not: staff.userId },
        },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: "Bu email band" }, { status: 400 });
      }
    }

    const userData: {
      name?: string;
      email?: string;
      phone?: string | null;
      passwordHash?: string;
    } = {};
    if (body.name !== undefined) userData.name = body.name;
    if (body.email !== undefined) userData.email = body.email;
    if (body.phone !== undefined) userData.phone = body.phone;
    if (body.password) {
      userData.passwordHash = await bcrypt.hash(body.password, 10);
    }

    if (Object.keys(userData).length > 0) {
      await prisma.user.update({
        where: { id: staff.userId },
        data: userData,
      });
    }

    if (body.role !== undefined && isPlatformStaffRole(body.role)) {
      await prisma.$executeRaw`
        UPDATE PlatformStaff SET role = ${body.role}, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ${body.id}
      `;
    }
    if (body.permissions !== undefined) {
      const permsJson = permissionsToJson(normalizePermissions(body.permissions));
      await prisma.$executeRaw`
        UPDATE PlatformStaff SET permissions = ${permsJson}, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ${body.id}
      `;
    }
    if (body.isActive !== undefined) {
      await prisma.$executeRaw`
        UPDATE PlatformStaff SET isActive = ${body.isActive ? 1 : 0}, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ${body.id}
      `;
    }

    const updated = (await listPlatformStaff()).find((row) => row.id === body.id);
    return NextResponse.json({
      ok: true,
      staff: updated ?? null,
      ...(body.password ? { password: body.password } : {}),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
    }
    console.error("platform staff patch:", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "ID kerak" }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<
    Array<{ id: string; userId: string }>
  >`
    SELECT id, userId FROM PlatformStaff WHERE id = ${body.id} LIMIT 1
  `;
  const staff = rows[0];
  if (!staff) {
    return NextResponse.json({ error: "Xodim topilmadi" }, { status: 404 });
  }

  if (staff.userId === session.userId) {
    return NextResponse.json({ error: "O'zingizni o'chirib bo'lmaydi" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.platformStaff.delete({ where: { id: body.id } }),
    prisma.user.update({
      where: { id: staff.userId },
      data: { globalRole: "USER" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

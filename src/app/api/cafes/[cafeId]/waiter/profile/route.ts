import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { replaceLocalUpload } from "@/lib/uploads";

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  avatarUrl: z
    .string()
    .refine((v) => {
      if (v === "") return true;
      if (v.startsWith("/uploads/")) return true;
      if (v.startsWith("data:image/")) return true;
      if (!/^https?:\/\//i.test(v)) return false;
      if (/google\.[^/]+\/(search|imgres|url\?)/i.test(v)) return false;
      return /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(v) || v.includes("googleusercontent.com");
    }, {
      message: "Faqat rasm fayli, data URL yoki /uploads/ manzili",
    })
    .optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeStaff(cafeId);
    if (!access.ok) return access.response;

    const user = await prisma.user.findUnique({
      where: { id: access.session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({ profile: user });
  } catch (error) {
    console.error("Error loading profile:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeStaff(cafeId);
    if (!access.ok) return access.response;

    const body = updateProfileSchema.parse(await request.json());

    let passwordHash = undefined;
    if (body.password) {
      const bcrypt = await import("bcryptjs");
      passwordHash = await bcrypt.hash(body.password, 10);
    }

    const existing =
      body.avatarUrl !== undefined
        ? await prisma.user.findUnique({
            where: { id: access.session.userId },
            select: { avatarUrl: true },
          })
        : null;

    const updatedUser = await prisma.user.update({
      where: { id: access.session.userId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl || null }),
        ...(passwordHash && { passwordHash }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
      },
    });

    if (body.avatarUrl !== undefined && existing) {
      await replaceLocalUpload(
        existing.avatarUrl,
        body.avatarUrl || null,
        cafeId,
      );
    }

    return NextResponse.json({ profile: updatedUser });
  } catch (error) {
    console.error("Error updating profile:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

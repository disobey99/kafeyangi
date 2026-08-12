import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, isSuperAdmin } from "@/lib/auth";
import { ensureSlug } from "@/lib/utils";
import { resolveCafeLocation } from "@/lib/geocode";

const createSchema = z.object({
  cafeName: z.string().trim().min(2).max(120),
  slug: z.string().trim().optional(),
  ownerName: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(6).max(120),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(300).optional(),
  region: z.string().trim().max(80).optional(),
  plan: z.enum(["STARTER", "STANDARD", "PRO"]).optional(),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED"]).optional(),
  trialDays: z.number().int().min(0).max(365).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  try {
    const body = createSchema.parse(await request.json());
    const slug = ensureSlug(body.slug || body.cafeName);

    const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
    if (existingUser) {
      return NextResponse.json({ error: "Bu email band" }, { status: 400 });
    }

    const existingCafe = await prisma.cafe.findUnique({ where: { slug } });
    if (existingCafe) {
      return NextResponse.json({ error: "Bu slug band" }, { status: 400 });
    }

    const location = await resolveCafeLocation({
      address: body.address,
      region: body.region,
    });

    const trialDays = body.trialDays ?? 14;
    const status = body.status ?? "TRIAL";
    const trialEndsAt =
      status === "TRIAL" && trialDays > 0
        ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
        : null;

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        name: body.ownerName,
        email: body.email,
        phone: body.phone || null,
        passwordHash,
      },
    });

    const cafe = await prisma.cafe.create({
      data: {
        name: body.cafeName,
        slug,
        address: location.address,
        region: location.region,
        latitude: location.latitude,
        longitude: location.longitude,
        phone: body.phone || null,
        ownerId: user.id,
        status,
        plan: body.plan ?? "STARTER",
        trialEndsAt,
        members: { create: { userId: user.id, role: "OWNER" } },
        categories: { create: { name: "Asosiy menyu", sortOrder: 1 } },
        prepStations: {
          create: { name: "Oshxona", sortOrder: 0, isDefault: true },
        },
      },
    });

    return NextResponse.json(
      {
        cafe: {
          id: cafe.id,
          name: cafe.name,
          slug: cafe.slug,
          status: cafe.status,
          plan: cafe.plan,
          trialEndsAt: cafe.trialEndsAt?.toISOString() ?? null,
          owner: { name: user.name, email: user.email, phone: user.phone },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Ma'lumot noto'g'ri" },
        { status: 400 },
      );
    }
    console.error("platform create cafe:", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

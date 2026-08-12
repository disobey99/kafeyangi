import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { attachSessionCookie, createSessionToken } from "@/lib/auth";
import { ensureSlug } from "@/lib/utils";
import { resolveCafeLocation } from "@/lib/geocode";
import {
  checkRateLimit,
  clientIpFromHeaders,
  rateLimitResponse,
} from "@/lib/rate-limit";

const schema = z.object({
  cafeName: z.string().trim().min(2, "Kafe nomi kamida 2 ta belgi"),
  slug: z.string().optional(),
  ownerName: z.string().trim().min(2, "Ism kamida 2 ta belgi"),
  email: z.string().trim().email("Email noto'g'ri"),
  password: z.string().min(6, "Parol kamida 6 ta belgi"),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  region: z.string().trim().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

function formatZodError(error: z.ZodError) {
  return error.issues.map((i) => i.message).join(". ");
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromHeaders(request.headers);
    const ipLimit = checkRateLimit({
      key: `register:ip:${ip}`,
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });
    if (!ipLimit.ok) {
      return rateLimitResponse(ipLimit.retryAfterSec);
    }

    const body = await request.json();
    const parsed = schema.parse(body);

    const slug = ensureSlug(parsed.slug || parsed.cafeName);

    const data = {
      ...parsed,
      slug,
      phone: parsed.phone || undefined,
      address: parsed.address || undefined,
    };

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Bu email allaqachon ro'yxatdan o'tgan" },
        { status: 400 }
      );
    }

    const existingCafe = await prisma.cafe.findUnique({
      where: { slug: data.slug },
    });
    if (existingCafe) {
      return NextResponse.json(
        { error: "Bu kafe manzili band. Boshqa URL tanlang" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const location = await resolveCafeLocation({
      address: data.address,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      region: parsed.region,
    });

    const user = await prisma.user.create({
      data: {
        name: data.ownerName,
        email: data.email,
        phone: data.phone,
        passwordHash,
      },
    });

    const cafe = await prisma.cafe.create({
      data: {
        name: data.cafeName,
        slug: data.slug,
        address: location.address,
        region: location.region,
        latitude: location.latitude,
        longitude: location.longitude,
        phone: data.phone,
        ownerId: user.id,
        status: "TRIAL",
        trialEndsAt,
        members: {
          create: { userId: user.id, role: "OWNER" },
        },
        categories: {
          create: {
            name: "Asosiy menyu",
            sortOrder: 1,
          },
        },
        prepStations: {
          create: {
            name: "Oshxona",
            sortOrder: 0,
            isDefault: true,
          },
        },
      },
    });

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      globalRole: user.globalRole,
    });
    const res = NextResponse.json(
      { cafeId: cafe.id, slug: cafe.slug },
      { status: 201 },
    );
    attachSessionCookie(res, token);
    return res;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: formatZodError(error) },
        { status: 400 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ available: false });
  }

  const exists = await prisma.cafe.findUnique({ where: { slug } });
  return NextResponse.json({ available: !exists });
}

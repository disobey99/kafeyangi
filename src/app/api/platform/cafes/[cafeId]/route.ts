import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { CafeSuspendReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { coordsForRegion } from "@/lib/uz-regions";
import { applyPlatformSubscriptionPatch } from "@/lib/plan-access";
import { parseDbDate, toIsoDate } from "@/lib/parse-db-date";
import { requirePlatformApiPermission } from "@/lib/session-guard";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .nullable();

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  address: z.string().max(300).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  region: z.string().max(80).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"]).optional(),
  plan: z.enum(["STARTER", "STANDARD", "PRO"]).optional(),
  extendDays: z.number().int().min(1).max(365).optional(),
  trialEndsAt: dateOnly,
  subscriptionEndsAt: dateOnly,
});

function endOfDay(dateStr: string): Date {
  // UTC kun oxiri — Vercel TZ siljishini kamaytiradi
  return new Date(`${dateStr}T23:59:59.999Z`);
}

function applyExpirySuspension(
  baseData: {
    status?: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
    suspendReason?: CafeSuspendReason | null;
    trialEndsAt?: Date | null;
    subscriptionEndsAt?: Date | null;
  },
  existing: {
    status: string;
    trialEndsAt: string | number | bigint | null;
    subscriptionEndsAt: string | number | bigint | null;
  },
  input: {
    status?: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
    trialEndsAt?: string | null;
    subscriptionEndsAt?: string | null;
  },
) {
  if (input.status === "SUSPENDED" || input.status === "CANCELLED") return;

  const now = new Date();
  const mergedStatus = baseData.status ?? existing.status;
  const trialEnd =
    baseData.trialEndsAt !== undefined
      ? baseData.trialEndsAt
      : parseDbDate(existing.trialEndsAt);

  if (mergedStatus === "TRIAL" && trialEnd && trialEnd < now) {
    baseData.status = "SUSPENDED";
    baseData.suspendReason = "TRIAL";
    return;
  }

  const subEnd =
    baseData.subscriptionEndsAt !== undefined
      ? baseData.subscriptionEndsAt
      : parseDbDate(existing.subscriptionEndsAt);

  if (mergedStatus === "ACTIVE" && subEnd && subEnd < now) {
    baseData.status = "SUSPENDED";
    baseData.suspendReason = "BILLING";
  }
}

function serializeCafe(row: {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  address: string | null;
  region: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  trialEndsAt: string | number | bigint | Date | null;
  subscriptionEndsAt: string | number | bigint | Date | null;
  suspendReason: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
}) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    plan: row.plan,
    address: row.address,
    region: row.region,
    phone: row.phone,
    latitude: row.latitude,
    longitude: row.longitude,
    trialEndsAt: toIsoDate(row.trialEndsAt),
    subscriptionEndsAt: toIsoDate(row.subscriptionEndsAt),
    suspendReason: row.suspendReason,
    owner: {
      name: row.ownerName,
      email: row.ownerEmail,
      phone: row.ownerPhone,
    },
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const access = await requirePlatformApiPermission("menu.cafes");
  if (!access.ok) return access.response;

  const { cafeId } = await params;
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      plan: string;
      address: string | null;
      region: string | null;
      phone: string | null;
      latitude: number | null;
      longitude: number | null;
      trialEndsAt: string | null;
      subscriptionEndsAt: string | null;
      suspendReason: string | null;
      ownerName: string;
      ownerEmail: string;
      ownerPhone: string | null;
    }>
  >`
    SELECT c.id, c.name, c.slug, c.status, c.plan, c.address, c.region, c.phone,
           c.latitude, c.longitude, c.trialEndsAt, c.subscriptionEndsAt, c.suspendReason,
           u.name AS ownerName, u.email AS ownerEmail, u.phone AS ownerPhone
    FROM Cafe c
    JOIN User u ON u.id = c.ownerId
    WHERE c.id = ${cafeId}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  return NextResponse.json({ cafe: serializeCafe(row) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const access = await requirePlatformApiPermission("action.cafes.manage");
  if (!access.ok) return access.response;

  try {
    const { cafeId } = await params;
    const body = patchSchema.parse(await request.json());

    const existing = await prisma.$queryRaw<
      Array<{
        id: string;
        status: string;
        trialEndsAt: string | number | bigint | null;
        subscriptionEndsAt: string | number | bigint | null;
      }>
    >`
      SELECT id, status, trialEndsAt, subscriptionEndsAt
      FROM Cafe WHERE id = ${cafeId} LIMIT 1
    `;
    if (!existing[0]) {
      return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    }

    let latitude = body.latitude;
    let longitude = body.longitude;
    if (body.region && body.latitude === undefined && body.longitude === undefined) {
      const coords = coordsForRegion(body.region);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }

    const baseData: {
      name?: string;
      address?: string | null;
      phone?: string | null;
      status?: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
      suspendReason?: CafeSuspendReason | null;
      plan?: "STARTER" | "STANDARD" | "PRO";
      trialEndsAt?: Date | null;
      subscriptionEndsAt?: Date | null;
    } = {};
    if (body.name !== undefined) baseData.name = body.name;
    if (body.address !== undefined) baseData.address = body.address;
    if (body.phone !== undefined) baseData.phone = body.phone;
    if (body.status !== undefined) baseData.status = body.status;
    if (body.plan !== undefined) baseData.plan = body.plan;

    if (body.status === "SUSPENDED") {
      baseData.suspendReason = "ADMIN";
    } else if (body.status === "ACTIVE" || body.status === "TRIAL") {
      baseData.suspendReason = null;
    }

    if (body.trialEndsAt !== undefined) {
      baseData.trialEndsAt = body.trialEndsAt ? endOfDay(body.trialEndsAt) : null;
    }
    if (body.subscriptionEndsAt !== undefined) {
      baseData.subscriptionEndsAt = body.subscriptionEndsAt
        ? endOfDay(body.subscriptionEndsAt)
        : null;
    }

    if (body.extendDays) {
      const nextStatus = body.status ?? existing[0].status;
      const daysMs = body.extendDays * 24 * 60 * 60 * 1000;
      if (nextStatus === "TRIAL") {
        const prev = parseDbDate(existing[0].trialEndsAt);
        const base = prev && prev > new Date() ? prev : new Date();
        baseData.trialEndsAt = new Date(base.getTime() + daysMs);
      } else {
        const prev = parseDbDate(existing[0].subscriptionEndsAt);
        const base = prev && prev > new Date() ? prev : new Date();
        baseData.subscriptionEndsAt = new Date(base.getTime() + daysMs);
        if (!body.status) baseData.status = "ACTIVE";
      }
    }

    applyPlatformSubscriptionPatch(
      existing[0],
      {
        status: body.status,
        plan: body.plan,
        extendDays: body.extendDays,
        trialEndsAt:
          body.trialEndsAt === undefined
            ? undefined
            : body.trialEndsAt
              ? endOfDay(body.trialEndsAt)
              : null,
      },
      baseData,
    );

    if (baseData.status === "ACTIVE" || baseData.status === "TRIAL") {
      baseData.suspendReason = null;
    }
    if (baseData.status === "SUSPENDED" && body.status === "SUSPENDED") {
      baseData.suspendReason = "ADMIN";
    }

    applyExpirySuspension(baseData, existing[0], {
      status: body.status,
      trialEndsAt: body.trialEndsAt,
      subscriptionEndsAt: body.subscriptionEndsAt,
    });

    if (Object.keys(baseData).length > 0) {
      await prisma.cafe.update({ where: { id: cafeId }, data: baseData });
    }

    if (
      body.region !== undefined ||
      latitude !== undefined ||
      longitude !== undefined
    ) {
      const region = body.region === undefined ? undefined : body.region;
      if (region !== undefined && latitude !== undefined && longitude !== undefined) {
        await prisma.$executeRaw`
          UPDATE Cafe SET region = ${region}, latitude = ${latitude}, longitude = ${longitude}
          WHERE id = ${cafeId}
        `;
      } else if (region !== undefined) {
        await prisma.$executeRaw`
          UPDATE Cafe SET region = ${region}, latitude = ${latitude ?? null}, longitude = ${longitude ?? null}
          WHERE id = ${cafeId}
        `;
      } else if (latitude !== undefined || longitude !== undefined) {
        await prisma.$executeRaw`
          UPDATE Cafe SET latitude = ${latitude ?? null}, longitude = ${longitude ?? null}
          WHERE id = ${cafeId}
        `;
      }
    }

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        status: string;
        plan: string;
        address: string | null;
        region: string | null;
        phone: string | null;
        latitude: number | null;
        longitude: number | null;
        trialEndsAt: string | null;
        subscriptionEndsAt: string | null;
        suspendReason: string | null;
        ownerName: string;
        ownerEmail: string;
        ownerPhone: string | null;
      }>
    >`
      SELECT c.id, c.name, c.slug, c.status, c.plan, c.address, c.region, c.phone,
             c.latitude, c.longitude, c.trialEndsAt, c.subscriptionEndsAt, c.suspendReason,
             u.name AS ownerName, u.email AS ownerEmail, u.phone AS ownerPhone
      FROM Cafe c
      JOIN User u ON u.id = c.ownerId
      WHERE c.id = ${cafeId}
      LIMIT 1
    `;

    const cafe = rows[0];
    if (!cafe) {
      return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    }

    return NextResponse.json({ cafe: serializeCafe(cafe) });
  } catch (error) {
    console.error("platform cafe patch:", error);
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri"
        : error instanceof Error
          ? error.message
          : "Ma'lumotlar noto'g'ri";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

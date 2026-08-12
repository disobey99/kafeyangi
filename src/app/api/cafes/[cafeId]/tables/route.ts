import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import {
  createCafeTable,
  getActiveCafeTables,
  syncCafeTableCount,
} from "@/lib/cafe-tables";
import { getCafePlanContext } from "@/lib/plan-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const [tables, planCtx] = await Promise.all([
    getActiveCafeTables(cafeId),
    getCafePlanContext(cafeId),
  ]);

  return NextResponse.json({
    tables,
    maxTables: planCtx?.config.maxTables ?? 10,
    planName: planCtx?.config.name ?? "Starter",
  });
}

const syncSchema = z.object({
  count: z.number().int().min(0).max(999),
  defaultSeats: z.number().int().min(1).max(99).optional(),
  defaultZone: z.string().optional(),
});

const createSchema = z.object({
  zone: z.string().default("HALL"),
  seats: z.number().int().min(1).max(99).optional(),
  name: z.string().trim().max(80).optional(),
});

async function assertTableLimit(cafeId: string, planCtx: NonNullable<Awaited<ReturnType<typeof getCafePlanContext>>>) {
  if (!planCtx.subscription.active) {
    return NextResponse.json(
      { error: planCtx.subscription.reason ?? "Obuna faol emas" },
      { status: 403 },
    );
  }
  const activeCount = await prisma.table.count({ where: { cafeId, isActive: true } });
  if (activeCount >= planCtx.config.maxTables) {
    return NextResponse.json(
      {
        error: `${planCtx.config.name} tarifida maksimum ${planCtx.config.maxTables} ta stol. Tarifni yangilang.`,
      },
      { status: 403 },
    );
  }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;

    const body = createSchema.parse(await request.json());
    const planCtx = await getCafePlanContext(cafeId);
    if (!planCtx) {
      return NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 });
    }

    const limitError = await assertTableLimit(cafeId, planCtx);
    if (limitError) return limitError;

    const table = await createCafeTable(cafeId, {
      zone: body.zone,
      seats: body.seats ?? 4,
      name: body.name,
    });

    const tables = await getActiveCafeTables(cafeId);
    return NextResponse.json({ table, tables, count: tables.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;

    const { count, defaultSeats, defaultZone } = syncSchema.parse(await request.json());
    const zone = defaultZone ?? "HALL";

    const planCtx = await getCafePlanContext(cafeId);
    if (!planCtx) {
      return NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 });
    }
    if (!planCtx.subscription.active) {
      return NextResponse.json(
        { error: planCtx.subscription.reason ?? "Obuna faol emas" },
        { status: 403 }
      );
    }

    const otherZoneCount = await prisma.table.count({
      where: { cafeId, isActive: true, zone: { not: zone } },
    });
    if (otherZoneCount + count > planCtx.config.maxTables) {
      return NextResponse.json(
        {
          error: `${planCtx.config.name} tarifida jami maksimum ${planCtx.config.maxTables} ta stol (${otherZoneCount} ta boshqa zonada).`,
        },
        { status: 403 }
      );
    }

    const tables = await syncCafeTableCount(cafeId, count, defaultSeats ?? 4, zone);

    return NextResponse.json({
      tables,
      count: tables.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Stol soni 1–999 oralig'ida bo'lishi kerak" }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

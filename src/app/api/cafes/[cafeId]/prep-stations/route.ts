import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager, requireCafeStaff } from "@/lib/cafe-access";
import { ensureDefaultPrepStation, listPrepStations } from "@/lib/prep-stations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "1";

  const stations = await listPrepStations(cafeId, !all);
  return NextResponse.json({ stations });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  isDefault: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;

    const body = createSchema.parse(await request.json());
    await ensureDefaultPrepStation(cafeId);

    const last = await prisma.prepStation.findFirst({
      where: { cafeId },
      orderBy: { sortOrder: "desc" },
    });

    const makeDefault = body.isDefault === true;

    if (makeDefault) {
      await prisma.prepStation.updateMany({
        where: { cafeId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const station = await prisma.prepStation.create({
      data: {
        cafeId,
        name: body.name,
        sortOrder: (last?.sortOrder ?? 0) + 1,
        isDefault: makeDefault,
        isActive: true,
      },
    });

    return NextResponse.json({ station }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }
}

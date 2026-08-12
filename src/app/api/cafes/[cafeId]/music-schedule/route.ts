import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const schedules = await prisma.musicSchedule.findMany({
    where: { cafeId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ schedules });
}

const schema = z.object({
  title: z.string().min(2),
  source: z.string().min(4),
  startsAt: z.string().regex(/^\d{2}:\d{2}$/),
  endsAt: z.string().regex(/^\d{2}:\d{2}$/),
  volume: z.number().int().min(0).max(100).default(70),
  daysMask: z.string().default("1234567"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;
  const input = schema.parse(await request.json());

  const schedule = await prisma.musicSchedule.create({
    data: { cafeId, ...input },
  });
  return NextResponse.json({ schedule });
}

const patchSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;
  const input = patchSchema.parse(await request.json());

  const schedule = await prisma.musicSchedule.update({
    where: { id: input.id },
    data: { isActive: input.isActive },
  });
  return NextResponse.json({ schedule });
}

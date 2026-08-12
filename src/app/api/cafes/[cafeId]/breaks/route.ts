import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  const sessions = await prisma.breakSession.findMany({
    where: { cafeId },
    orderBy: { startedAt: "desc" },
    take: 40,
  });
  return NextResponse.json({ sessions });
}

const startSchema = z.object({
  plannedMin: z.number().int().min(1).max(120).default(15),
  note: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;
  const input = startSchema.parse(await request.json());

  const session = await prisma.breakSession.create({
    data: {
      cafeId,
      userId: access.session.userId,
      userName: access.session.name,
      plannedMin: input.plannedMin,
      note: input.note,
    },
  });
  return NextResponse.json({ session });
}

const endSchema = z.object({
  id: z.string(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;
  const input = endSchema.parse(await request.json());

  const session = await prisma.breakSession.update({
    where: { id: input.id },
    data: { endedAt: new Date() },
  });
  return NextResponse.json({ session });
}

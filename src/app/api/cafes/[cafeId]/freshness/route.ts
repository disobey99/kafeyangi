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

  const now = new Date();
  await prisma.freshnessItem.updateMany({
    where: { cafeId, isExpired: false, expiresAt: { lt: now } },
    data: { isExpired: true },
  });

  const items = await prisma.freshnessItem.findMany({
    where: { cafeId },
    orderBy: { expiresAt: "asc" },
    take: 100,
  });
  return NextResponse.json({ items });
}

const createSchema = z.object({
  name: z.string().min(2),
  expiresAt: z.string(),
  location: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;
  const input = createSchema.parse(await request.json());

  const item = await prisma.freshnessItem.create({
    data: {
      cafeId,
      name: input.name,
      expiresAt: new Date(input.expiresAt),
      location: input.location,
      note: input.note,
    },
  });
  return NextResponse.json({ item });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { publishCafeEvent } from "@/lib/realtime";

async function withAcceptorNames<
  T extends { acceptedBy: string | null; acceptedByName?: string | null },
>(swaps: T[]) {
  const ids = [
    ...new Set(
      swaps
        .map((s) => s.acceptedBy)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (ids.length === 0) {
    return swaps.map((s) => ({
      ...s,
      acceptedByName: s.acceptedByName ?? null,
    }));
  }
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  return swaps.map((s) => ({
    ...s,
    acceptedByName:
      s.acceptedByName ?? (s.acceptedBy ? names[s.acceptedBy] ?? null : null),
  }));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  const swaps = await prisma.shiftSwapRequest.findMany({
    where: { cafeId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ swaps: await withAcceptorNames(swaps) });
}

const createSchema = z.object({
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
  note: z.string().max(400).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  let input: z.infer<typeof createSchema>;
  try {
    input = createSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }

  const fromDate = new Date(input.fromDate);
  const toDate = new Date(input.toDate);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Sana noto'g'ri" }, { status: 400 });
  }
  if (toDate <= fromDate) {
    return NextResponse.json(
      { error: "Tugash sanasi boshlanishdan keyin bo'lishi kerak" },
      { status: 400 },
    );
  }

  const swap = await prisma.shiftSwapRequest.create({
    data: {
      cafeId,
      requesterId: access.session.userId,
      requesterName: access.session.name,
      fromDate,
      toDate,
      note: input.note?.trim() || null,
    },
  });
  publishCafeEvent(cafeId, { type: "ops.shift_swap.updated", payload: { swap } });
  return NextResponse.json({ swap });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["OPEN", "ACCEPTED", "DECLINED", "CANCELLED"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  let input: z.infer<typeof patchSchema>;
  try {
    input = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }

  const existing = await prisma.shiftSwapRequest.findFirst({
    where: { id: input.id, cafeId },
  });
  if (!existing) {
    return NextResponse.json({ error: "So'rov topilmadi" }, { status: 404 });
  }

  const uid = access.session.userId;

  if (input.status === "CANCELLED") {
    if (existing.requesterId !== uid) {
      return NextResponse.json(
        { error: "Faqat o'z so'rovingizni bekor qilishingiz mumkin" },
        { status: 403 },
      );
    }
    if (existing.status !== "OPEN") {
      return NextResponse.json(
        { error: "Faqat ochiq so'rovni bekor qilish mumkin" },
        { status: 400 },
      );
    }
  }

  if (input.status === "ACCEPTED" || input.status === "DECLINED") {
    if (existing.status !== "OPEN") {
      return NextResponse.json(
        { error: "Bu so'rov allaqachon yopilgan" },
        { status: 400 },
      );
    }
    if (existing.requesterId === uid) {
      return NextResponse.json(
        { error: "O'z so'rovingizni qabul qila olmaysiz" },
        { status: 400 },
      );
    }
  }

  if (input.status === "OPEN") {
    return NextResponse.json({ error: "Statusni qayta ochib bo'lmaydi" }, { status: 400 });
  }

  const updated = await prisma.shiftSwapRequest.update({
    where: { id: input.id },
    data: {
      status: input.status,
      acceptedBy: input.status === "ACCEPTED" ? uid : existing.acceptedBy,
      acceptedByName:
        input.status === "ACCEPTED" ? access.session.name : existing.acceptedByName,
    },
  });
  publishCafeEvent(cafeId, {
    type: "ops.shift_swap.updated",
    payload: { swap: { ...updated, acceptedByName: updated.acceptedByName ?? access.session.name } },
  });
  return NextResponse.json({
    swap: {
      ...updated,
      acceptedByName:
        updated.acceptedByName ??
        (input.status === "ACCEPTED" ? access.session.name : null),
    },
  });
}

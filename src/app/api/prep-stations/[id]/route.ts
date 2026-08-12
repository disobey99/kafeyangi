import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";

async function requireStationAccess(id: string) {
  const station = await prisma.prepStation.findUnique({ where: { id } });
  if (!station) {
    return { ok: false as const, response: NextResponse.json({ error: "Stansiya topilmadi" }, { status: 404 }) };
  }
  const access = await requireCafeManager(station.cafeId);
  if (!access.ok) return access;
  return { ok: true as const, station, cafe: access.cafe };
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  printerHost: z
    .string()
    .trim()
    .max(160)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v == null ? null : v)),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const access = await requireStationAccess(id);
    if (!access.ok) return access.response;

    const body = patchSchema.parse(await request.json());

    if (body.isDefault === true) {
      await prisma.prepStation.updateMany({
        where: { cafeId: access.station.cafeId, isDefault: true },
        data: { isDefault: false },
      });
    }

    if (body.isActive === false && access.station.isDefault) {
      return NextResponse.json(
        { error: "Asosiy stansiyani o'chirib bo'lmaydi — avval boshqasini asosiy qiling" },
        { status: 400 },
      );
    }

    const station = await prisma.prepStation.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.printerHost !== undefined && { printerHost: body.printerHost }),
      },
    });

    return NextResponse.json({ station });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireStationAccess(id);
  if (!access.ok) return access.response;

  if (access.station.isDefault) {
    return NextResponse.json(
      { error: "Asosiy stansiyani o'chirib bo'lmaydi" },
      { status: 400 },
    );
  }

  const activeCount = await prisma.prepStation.count({
    where: { cafeId: access.station.cafeId, isActive: true },
  });
  if (activeCount <= 1) {
    return NextResponse.json(
      { error: "Kamida bitta stansiya qolishi kerak" },
      { status: 400 },
    );
  }

  // Soft-delete — tarixiy buyurtmalar saqlanadi
  await prisma.prepStation.update({
    where: { id },
    data: { isActive: false, isDefault: false },
  });

  await prisma.product.updateMany({
    where: { prepStationId: id },
    data: { prepStationId: null },
  });
  await prisma.category.updateMany({
    where: { defaultPrepStationId: id },
    data: { defaultPrepStationId: null },
  });

  return NextResponse.json({ ok: true });
}

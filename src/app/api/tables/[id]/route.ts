import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { publishCafeEvent } from "@/lib/realtime";

const schema = z.object({
  status: z.enum(["FREE", "OCCUPIED", "BILL_REQUESTED"]).optional(),
  zone: z.enum(["HALL", "BOOTH", "OUTDOOR"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const table = await prisma.table.findUnique({ where: { id } });
    if (!table) {
      return NextResponse.json({ error: "Stol topilmadi" }, { status: 404 });
    }

    const access = await requireCafeManager(table.cafeId);
    if (!access.ok) return access.response;

    const body = schema.parse(await request.json());
    if (body.status == null && body.zone == null) {
      return NextResponse.json({ error: "Yangilash uchun maydon kerak" }, { status: 400 });
    }

    const updated = await prisma.table.update({
      where: { id },
      data: {
        ...(body.status != null ? { status: body.status } : {}),
        ...(body.zone != null ? { zone: body.zone } : {}),
      },
    });

    publishCafeEvent(table.cafeId, { type: "table.updated" });

    return NextResponse.json({ table: updated });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

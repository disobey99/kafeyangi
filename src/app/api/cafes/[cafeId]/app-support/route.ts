import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";

function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.replace(/\D/g, "").length < 7) {
    throw new Error("Telefon raqam juda qisqa");
  }
  return trimmed.slice(0, 40);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: { phone: true },
  });
  if (!cafe) {
    return NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 });
  }

  const rows = await prisma.$queryRaw<Array<{ supportPhone: string | null }>>`
    SELECT supportPhone FROM Cafe WHERE id = ${cafeId} LIMIT 1
  `;

  return NextResponse.json({
    supportPhone: rows[0]?.supportPhone ?? "",
    cafePhone: cafe.phone ?? "",
  });
}

const schema = z.object({
  supportPhone: z.string().max(40).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  try {
    const body = schema.parse(await request.json());
    let supportPhone: string | null = null;
    if (body.supportPhone != null) {
      supportPhone = normalizePhone(body.supportPhone);
    }

    await prisma.$executeRaw`
      UPDATE Cafe SET supportPhone = ${supportPhone} WHERE id = ${cafeId}
    `;

    return NextResponse.json({
      supportPhone: supportPhone ?? "",
      ok: true,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

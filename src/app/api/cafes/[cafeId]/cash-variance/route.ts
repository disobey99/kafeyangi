import { CafeRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { getZReport } from "@/lib/z-report";

const Z_ROLES = [CafeRole.OWNER, CafeRole.MANAGER, CafeRole.CASHIER];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId, Z_ROLES);
  if (!access.ok) return access.response;

  const reports = await prisma.cashVarianceReport.findMany({
    where: { cafeId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ reports });
}

const schema = z.object({
  expectedCash: z.number().int().nonnegative().optional(),
  actualCash: z.number().int().nonnegative(),
  shiftLabel: z.string().max(80).optional(),
  note: z.string().max(500).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId, Z_ROLES);
  if (!access.ok) return access.response;

  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }

  const zReport = await getZReport(cafeId, input.date);
  const expectedCash =
    input.expectedCash != null ? input.expectedCash : zReport.expectedCash;

  const variance = input.actualCash - expectedCash;
  if (variance !== 0 && !input.note?.trim()) {
    return NextResponse.json(
      { error: "Farq mavjud. Izoh kiritish majburiy." },
      { status: 400 },
    );
  }

  const report = await prisma.cashVarianceReport.create({
    data: {
      cafeId,
      cashierId: access.session.userId,
      cashierName: access.session.name,
      shiftLabel: input.shiftLabel || `Z ${zReport.date}`,
      expectedCash,
      actualCash: input.actualCash,
      variance,
      note: input.note?.trim() || null,
    },
  });

  return NextResponse.json({ report });
}

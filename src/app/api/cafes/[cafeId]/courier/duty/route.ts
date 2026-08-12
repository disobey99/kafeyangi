import { NextResponse } from "next/server";
import { CafeRole } from "@prisma/client";
import { z } from "zod";
import { requireCafeStaff } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId, [
    CafeRole.COURIER,
    CafeRole.OWNER,
    CafeRole.MANAGER,
  ]);
  if (!access.ok) return access.response;

  const member = await prisma.cafeMember.findUnique({
    where: {
      cafeId_userId: { cafeId, userId: access.session.userId },
    },
    select: { onDuty: true, role: true },
  });

  return NextResponse.json({
    onDuty: Boolean(member?.onDuty),
  });
}

const patchSchema = z.object({
  onDuty: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId, [
    CafeRole.COURIER,
    CafeRole.OWNER,
    CafeRole.MANAGER,
  ]);
  if (!access.ok) return access.response;

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }

  const member = await prisma.cafeMember.findFirst({
    where: {
      cafeId,
      userId: access.session.userId,
      role: { in: [CafeRole.COURIER, CafeRole.OWNER, CafeRole.MANAGER] },
      isActive: true,
    },
  });

  if (!member) {
    return NextResponse.json({ error: "A'zolik topilmadi" }, { status: 403 });
  }

  // Faqat COURIER uchun onDuty saqlanadi; owner/manager ham testing uchun yoza oladi
  const updated = await prisma.cafeMember.update({
    where: { id: member.id },
    data: { onDuty: body.onDuty },
    select: { onDuty: true },
  });

  return NextResponse.json({ onDuty: updated.onDuty });
}

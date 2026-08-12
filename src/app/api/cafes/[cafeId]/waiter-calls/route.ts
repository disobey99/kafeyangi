import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  const { cafeId } = await params;

  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) {
    return NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 });
  }

  const calls = await prisma.waiterCall.findMany({
    where: { cafeId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: { table: { select: { number: true } } },
    take: 20,
  });

  return NextResponse.json({ calls });
}

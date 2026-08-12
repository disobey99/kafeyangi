import { NextResponse } from "next/server";
import { CafeRole } from "@prisma/client";
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

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: {
      cafeId,
      type: "DELIVERY",
      status: { not: "CANCELLED" },
      createdAt: { gte: since },
    },
    select: { createdAt: true },
  });

  const byHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
  }));

  for (const o of orders) {
    byHour[o.createdAt.getHours()].count += 1;
  }

  const sorted = [...byHour].sort((a, b) => b.count - a.count);
  const top = sorted.filter((h) => h.count > 0).slice(0, 3);
  const peakLabel = top
    .map((h) => `${String(h.hour).padStart(2, "0")}:00`)
    .join(", ");

  const tip =
    orders.length === 0
      ? "Hali yetkazish buyurtmalari kam — birinchi buyurtmalarni kuzating."
      : top.length > 0
        ? `So'nggi 14 kunda eng band soatlar: ${peakLabel}. Shu vaqtlarda tayyor bo'ling.`
        : "Buyurtmalar kun davomida tekis taqsimlangan.";

  return NextResponse.json({
    total: orders.length,
    days: 14,
    byHour,
    peakHours: top.map((h) => h.hour),
    tip,
  });
}

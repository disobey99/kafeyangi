import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const now = new Date();
  const day = now.getDay();
  const from = new Date();
  from.setDate(from.getDate() - 28);
  from.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      cafeId,
      status: "DELIVERED",
      createdAt: { gte: from },
    },
    select: { createdAt: true, items: { select: { quantity: true } } },
  });

  const byHour = new Map<number, { orders: number; items: number; samples: number }>();
  for (const order of orders) {
    if (order.createdAt.getDay() !== day) continue;
    const h = order.createdAt.getHours();
    const row = byHour.get(h) ?? { orders: 0, items: 0, samples: 0 };
    row.orders += 1;
    row.items += order.items.reduce((s, i) => s + i.quantity, 0);
    row.samples += 1;
    byHour.set(h, row);
  }

  const forecast = [...byHour.entries()]
    .map(([hour, row]) => ({
      hour,
      expectedOrders: Math.max(1, Math.round(row.orders / Math.max(1, row.samples))),
      expectedItems: Math.max(1, Math.round(row.items / Math.max(1, row.samples))),
    }))
    .sort((a, b) => b.expectedOrders - a.expectedOrders)
    .slice(0, 6);

  return NextResponse.json({ date: now.toISOString(), forecast });
}

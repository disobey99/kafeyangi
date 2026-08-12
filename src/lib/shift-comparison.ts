import { prisma } from "@/lib/prisma";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

async function dayMetrics(cafeId: string, from: Date, to: Date) {
  const orders = await prisma.order.findMany({
    where: {
      cafeId,
      createdAt: { gte: from, lte: to },
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const delivered = orders.filter((o) => o.status === "DELIVERED");
  const revenue = delivered.reduce((s, o) => s + o.totalAmount, 0);

  let fastestPrepSec: number | null = null;
  for (const o of delivered) {
    const sec = Math.round((o.updatedAt.getTime() - o.createdAt.getTime()) / 1000);
    if (sec > 0 && (fastestPrepSec === null || sec < fastestPrepSec)) {
      fastestPrepSec = sec;
    }
  }

  return {
    orderCount: orders.length,
    deliveredCount: delivered.length,
    revenue,
    fastestPrepSec,
  };
}

export async function getShiftComparison(cafeId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayStart.getTime() - 1);

  const [today, yesterday] = await Promise.all([
    dayMetrics(cafeId, todayStart, todayEnd),
    dayMetrics(cafeId, yesterdayStart, yesterdayEnd),
  ]);

  function pctChange(current: number, previous: number) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  return {
    today: {
      label: "Bugun",
      ...today,
    },
    yesterday: {
      label: "Kecha",
      ...yesterday,
    },
    change: {
      orderCount: pctChange(today.orderCount, yesterday.orderCount),
      revenue: pctChange(today.revenue, yesterday.revenue),
      fastestPrepSec:
        today.fastestPrepSec != null && yesterday.fastestPrepSec != null
          ? today.fastestPrepSec - yesterday.fastestPrepSec
          : null,
    },
  };
}

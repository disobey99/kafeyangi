import { prisma } from "@/lib/prisma";
import {
  getCafeStaffRatingMap,
  getCafeStaffRatingMapForPeriod,
} from "@/lib/staff-ratings";

export async function getStaffStats(cafeId: string, period: "day" | "week" = "week") {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "week") start.setDate(start.getDate() - 6);

  const [orders, calls, members, ratingsAll, periodRatingMap] = await Promise.all([
    prisma.order.findMany({
      where: {
        cafeId,
        createdAt: { gte: start },
        status: { not: "CANCELLED" },
        createdById: { not: null },
      },
      select: {
        createdById: true,
        tableId: true,
        totalAmount: true,
        serviceFeeAmount: true,
        source: true,
        status: true,
      },
    }),
    prisma.waiterCall.findMany({
      where: { cafeId, createdAt: { gte: start } },
      select: {
        respondedById: true,
        createdAt: true,
        respondedAt: true,
        status: true,
      },
    }),
    prisma.cafeMember.findMany({
      where: { cafeId, isActive: true },
      include: { user: { select: { id: true, name: true } } },
    }),
    getCafeStaffRatingMap(cafeId),
    getCafeStaffRatingMapForPeriod(cafeId, start),
  ]);

  const byUser = new Map<
    string,
    {
      userId: string;
      name: string;
      orderCount: number;
      deliveredCount: number;
      revenue: number;
      serviceFee: number;
      callsHandled: number;
      responseSamples: number[];
      tableIds: Set<string>;
    }
  >();

  for (const m of members) {
    byUser.set(m.userId, {
      userId: m.userId,
      name: m.user.name,
      orderCount: 0,
      deliveredCount: 0,
      revenue: 0,
      serviceFee: 0,
      callsHandled: 0,
      responseSamples: [],
      tableIds: new Set(),
    });
  }

  for (const o of orders) {
    if (!o.createdById) continue;
    const row = byUser.get(o.createdById);
    if (!row) continue;
    row.orderCount += 1;
    if (o.status === "DELIVERED") {
      row.deliveredCount += 1;
      row.revenue += o.totalAmount;
      if (o.serviceFeeAmount > 0) {
        row.serviceFee += o.serviceFeeAmount;
      }
      if (o.tableId) {
        row.tableIds.add(o.tableId);
      }
    }
  }

  for (const c of calls) {
    if (c.status !== "DONE" || !c.respondedById || !c.respondedAt) continue;
    const row = byUser.get(c.respondedById);
    if (!row) continue;
    row.callsHandled += 1;
    const sec = Math.round((c.respondedAt.getTime() - c.createdAt.getTime()) / 1000);
    row.responseSamples.push(sec);
  }

  const staff = [...byUser.values()]
    .map((s) => {
      const all = ratingsAll[s.userId] ?? { avgScore: 0, count: 0 };
      const periodR = periodRatingMap[s.userId] ?? { avgScore: 0, count: 0 };
      return {
        userId: s.userId,
        name: s.name,
        orderCount: s.orderCount,
        deliveredCount: s.deliveredCount,
        tablesServed: s.tableIds.size,
        revenue: s.revenue,
        revenueSom: Math.floor(s.revenue / 100),
        avgOrderAmount: s.deliveredCount > 0 ? Math.round(s.revenue / s.deliveredCount) : 0,
        avgOrderSom: s.deliveredCount > 0 ? Math.floor(s.revenue / s.deliveredCount / 100) : 0,
        serviceFee: s.serviceFee,
        serviceFeeSom: Math.floor(s.serviceFee / 100),
        callsHandled: s.callsHandled,
        avgResponseSec:
          s.responseSamples.length > 0
            ? Math.round(
                s.responseSamples.reduce((a, b) => a + b, 0) / s.responseSamples.length,
              )
            : null,
        ratingAvg: all.avgScore,
        ratingCount: all.count,
        periodRatingAvg: periodR.avgScore,
        periodRatingCount: periodR.count,
      };
    })
    .sort((a, b) => b.orderCount - a.orderCount);

  const pendingCalls = await prisma.waiterCall.count({
    where: { cafeId, status: "PENDING" },
  });

  return {
    period,
    staff,
    totals: {
      orders: orders.length,
      revenue: orders.filter((o) => o.status === "DELIVERED").reduce((s, o) => s + o.totalAmount, 0),
      serviceFee: orders
        .filter((o) => o.status === "DELIVERED" && o.source === "WAITER")
        .reduce((s, o) => s + o.serviceFeeAmount, 0),
      callsHandled: calls.filter((c) => c.status === "DONE").length,
      pendingCalls,
    },
  };
}

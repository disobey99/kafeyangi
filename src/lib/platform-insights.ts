import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export type FeatureUsage = {
  key: string;
  label: string;
  usedCount: number;
  totalCafes: number;
  adoptionPercent: number;
};

export type CafeInsightRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  region: string | null;
  todayRevenue: number;
  yesterdayRevenue: number;
  weekRevenue: number;
  todayOrders: number;
  trend: "up" | "down" | "flat";
  trendPercent: number;
};

const FEATURES: Array<{ key: string; label: string }> = [
  { key: "qr_orders", label: "QR / stol buyurtma" },
  { key: "online_orders", label: "Onlayn buyurtma" },
  { key: "waiter_orders", label: "Ofitsiant buyurtma" },
  { key: "loyalty", label: "Sodiqlik dasturi" },
  { key: "telegram", label: "Telegram ulangan" },
  { key: "promos", label: "Chegirmalar" },
  { key: "branches", label: "Ko'p filial" },
  { key: "payme", label: "Payme to'lov" },
];

function dayStart(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

export async function getPlatformCafeInsights() {
  const today0 = dayStart(0);
  const yesterday0 = dayStart(-1);
  const week0 = dayStart(-6);

  const cafeList = await prisma.cafe.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL", "SUSPENDED"] } },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      plan: true,
      region: true,
      telegramChatId: true,
      groupId: true,
      paymeEnabled: true,
    },
    orderBy: { name: "asc" },
  });

  const cafeIds = cafeList.map((c) => c.id);

  const deliveredOrders =
    cafeIds.length === 0
      ? []
      : await prisma.order.findMany({
          where: {
            cafeId: { in: cafeIds },
            status: "DELIVERED",
            createdAt: { gte: week0 },
          },
          select: {
            cafeId: true,
            totalAmount: true,
            createdAt: true,
            source: true,
          },
        });

  const revenueByCafe = new Map<
    string,
    { today: number; yesterday: number; week: number; todayOrders: number }
  >();
  for (const id of cafeIds) {
    revenueByCafe.set(id, { today: 0, yesterday: 0, week: 0, todayOrders: 0 });
  }
  for (const o of deliveredOrders) {
    const row = revenueByCafe.get(o.cafeId);
    if (!row) continue;
    row.week += o.totalAmount;
    if (o.createdAt >= today0) {
      row.today += o.totalAmount;
      row.todayOrders += 1;
    } else if (o.createdAt >= yesterday0 && o.createdAt < today0) {
      row.yesterday += o.totalAmount;
    }
  }

  const cafes = cafeList
    .map((c) => {
      const r = revenueByCafe.get(c.id)!;
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        plan: c.plan,
        region: c.region,
        todayRevenue: r.today,
        yesterdayRevenue: r.yesterday,
        weekRevenue: r.week,
        todayOrders: r.todayOrders,
      };
    })
    .sort((a, b) => b.todayRevenue - a.todayRevenue || a.name.localeCompare(b.name));

  const totalCafes = cafes.length || 1;

  const [
    qrCount,
    onlineCount,
    waiterCount,
    loyaltyCount,
    promoCount,
  ] = await Promise.all([
    prisma.order
      .findMany({
        where: {
          cafeId: { in: cafeIds },
          source: "QR_TABLE",
        },
        distinct: ["cafeId"],
        select: { cafeId: true },
      })
      .then((r) => r.length),
    prisma.order
      .findMany({
        where: { cafeId: { in: cafeIds }, source: "ONLINE" },
        distinct: ["cafeId"],
        select: { cafeId: true },
      })
      .then((r) => r.length),
    prisma.order
      .findMany({
        where: { cafeId: { in: cafeIds }, source: "WAITER" },
        distinct: ["cafeId"],
        select: { cafeId: true },
      })
      .then((r) => r.length),
    prisma.loyaltyCustomer
      .findMany({
        where: { cafeId: { in: cafeIds } },
        distinct: ["cafeId"],
        select: { cafeId: true },
      })
      .then((r) => r.length),
    prisma.promotion
      .findMany({
        where: { cafeId: { in: cafeIds } },
        distinct: ["cafeId"],
        select: { cafeId: true },
      })
      .then((r) => r.length),
  ]);

  const telegramCount = cafeList.filter(
    (c) => c.telegramChatId && c.telegramChatId.length > 0,
  ).length;
  const branchCount = cafeList.filter((c) => c.groupId != null).length;
  const paymeCount = cafeList.filter((c) => c.paymeEnabled).length;

  const counts = [
    qrCount,
    onlineCount,
    waiterCount,
    loyaltyCount,
    telegramCount,
    promoCount,
    branchCount,
    paymeCount,
  ];

  const featureUsage: FeatureUsage[] = FEATURES.map((feature, i) => {
    const usedCount = counts[i] ?? 0;
    return {
      key: feature.key,
      label: feature.label,
      usedCount,
      totalCafes,
      adoptionPercent: Math.round((usedCount / totalCafes) * 100),
    };
  });

  featureUsage.sort((a, b) => b.adoptionPercent - a.adoptionPercent);

  const cafeRows: CafeInsightRow[] = cafes.map((c) => {
    const today = c.todayRevenue;
    const yesterday = c.yesterdayRevenue;
    let trend: "up" | "down" | "flat" = "flat";
    let trendPercent = 0;
    if (yesterday > 0) {
      trendPercent = Math.round(((today - yesterday) / yesterday) * 100);
      if (trendPercent > 5) trend = "up";
      else if (trendPercent < -5) trend = "down";
    } else if (today > 0) {
      trend = "up";
      trendPercent = 100;
    }

    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      plan: c.plan,
      region: c.region,
      todayRevenue: today,
      yesterdayRevenue: yesterday,
      weekRevenue: c.weekRevenue,
      todayOrders: c.todayOrders,
      trend,
      trendPercent,
    };
  });

  const rising = cafeRows.filter((c) => c.trend === "up").length;
  const falling = cafeRows.filter((c) => c.trend === "down").length;

  return {
    summary: {
      totalCafes,
      rising,
      falling,
      totalTodayRevenue: cafeRows.reduce((s, c) => s + c.todayRevenue, 0),
      formattedTodayRevenue: formatPrice(
        cafeRows.reduce((s, c) => s + c.todayRevenue, 0),
      ),
    },
    featureUsage,
    unusedFeatures: featureUsage.filter((f) => f.adoptionPercent < 25),
    topFeatures: featureUsage.filter((f) => f.adoptionPercent >= 50).slice(0, 5),
    cafes: cafeRows,
  };
}

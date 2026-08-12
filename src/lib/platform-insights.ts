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
  return d.toISOString();
}

export async function getPlatformCafeInsights() {
  const cafes = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      plan: string;
      region: string | null;
      todayRevenue: number | bigint;
      yesterdayRevenue: number | bigint;
      weekRevenue: number | bigint;
      todayOrders: number | bigint;
    }>
  >`
    SELECT c.id, c.name, c.slug, c.status, c.plan, c.region,
      (SELECT COALESCE(SUM(o.totalAmount), 0) FROM "Order" o
       WHERE o.cafeId = c.id AND o.status = 'DELIVERED'
       AND datetime(o.createdAt) >= datetime(${dayStart(0)})) AS todayRevenue,
      (SELECT COALESCE(SUM(o.totalAmount), 0) FROM "Order" o
       WHERE o.cafeId = c.id AND o.status = 'DELIVERED'
       AND datetime(o.createdAt) >= datetime(${dayStart(-1)})
       AND datetime(o.createdAt) < datetime(${dayStart(0)})) AS yesterdayRevenue,
      (SELECT COALESCE(SUM(o.totalAmount), 0) FROM "Order" o
       WHERE o.cafeId = c.id AND o.status = 'DELIVERED'
       AND datetime(o.createdAt) >= datetime(${dayStart(-6)})) AS weekRevenue,
      (SELECT COUNT(*) FROM "Order" o
       WHERE o.cafeId = c.id AND o.status = 'DELIVERED'
       AND datetime(o.createdAt) >= datetime(${dayStart(0)})) AS todayOrders
    FROM Cafe c
    WHERE c.status IN ('ACTIVE', 'TRIAL', 'SUSPENDED')
    ORDER BY todayRevenue DESC, c.name ASC
  `;

  const totalCafes = cafes.length || 1;

  const featureCounts = await Promise.all([
    prisma.$queryRaw<Array<{ c: number | bigint }>>`
      SELECT COUNT(DISTINCT c.id) AS c FROM Cafe c
      WHERE c.status IN ('ACTIVE','TRIAL','SUSPENDED')
      AND EXISTS (SELECT 1 FROM "Order" o WHERE o.cafeId = c.id AND o.source = 'QR_TABLE')`,
    prisma.$queryRaw<Array<{ c: number | bigint }>>`
      SELECT COUNT(DISTINCT c.id) AS c FROM Cafe c
      WHERE c.status IN ('ACTIVE','TRIAL','SUSPENDED')
      AND EXISTS (SELECT 1 FROM "Order" o WHERE o.cafeId = c.id AND o.source = 'ONLINE')`,
    prisma.$queryRaw<Array<{ c: number | bigint }>>`
      SELECT COUNT(DISTINCT c.id) AS c FROM Cafe c
      WHERE c.status IN ('ACTIVE','TRIAL','SUSPENDED')
      AND EXISTS (SELECT 1 FROM "Order" o WHERE o.cafeId = c.id AND o.source = 'WAITER')`,
    prisma.$queryRaw<Array<{ c: number | bigint }>>`
      SELECT COUNT(DISTINCT c.id) AS c FROM Cafe c
      WHERE c.status IN ('ACTIVE','TRIAL','SUSPENDED')
      AND EXISTS (SELECT 1 FROM LoyaltyCustomer lc WHERE lc.cafeId = c.id)`,
    prisma.$queryRaw<Array<{ c: number | bigint }>>`
      SELECT COUNT(*) AS c FROM Cafe c
      WHERE c.status IN ('ACTIVE','TRIAL','SUSPENDED')
      AND c.telegramChatId IS NOT NULL AND c.telegramChatId != ''`,
    prisma.$queryRaw<Array<{ c: number | bigint }>>`
      SELECT COUNT(DISTINCT c.id) AS c FROM Cafe c
      WHERE c.status IN ('ACTIVE','TRIAL','SUSPENDED')
      AND EXISTS (SELECT 1 FROM Promotion p WHERE p.cafeId = c.id)`,
    prisma.$queryRaw<Array<{ c: number | bigint }>>`
      SELECT COUNT(*) AS c FROM Cafe c
      WHERE c.status IN ('ACTIVE','TRIAL','SUSPENDED') AND c.groupId IS NOT NULL`,
    prisma.$queryRaw<Array<{ c: number | bigint }>>`
      SELECT COUNT(*) AS c FROM Cafe c
      WHERE c.status IN ('ACTIVE','TRIAL','SUSPENDED') AND c.paymeEnabled = 1`,
  ]);

  const featureUsage: FeatureUsage[] = FEATURES.map((feature, i) => {
    const usedCount = Number(featureCounts[i][0]?.c ?? 0);
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
    const today = Number(c.todayRevenue);
    const yesterday = Number(c.yesterdayRevenue);
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
      weekRevenue: Number(c.weekRevenue),
      todayOrders: Number(c.todayOrders),
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

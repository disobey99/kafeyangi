import { prisma } from "@/lib/prisma";

const ACTIVE_ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
] as const;

export type ReportPeriod = "day" | "week" | "month" | "custom";

export type ReportQuery = {
  period: ReportPeriod;
  from?: string;
  to?: string;
};

export type PaymentBucket = "CASH" | "CARD" | "PAYME" | "OTHER";
export type SourceBucket = "QR_TABLE" | "ONLINE" | "WAITER" | "CASHIER";

const MAX_RANGE_DAYS = 90;

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function parseYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, day] = value.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  if (Number.isNaN(d.getTime())) return null;
  return startOfLocalDay(d);
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(start: Date, endExclusive: Date): number {
  return Math.round((endExclusive.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export function resolveReportRange(
  query: ReportQuery,
):
  | { ok: true; period: ReportPeriod; start: Date; endExclusive: Date }
  | { ok: false; error: string } {
  const now = new Date();
  const today = startOfLocalDay(now);

  if (query.period === "day") {
    return {
      ok: true,
      period: "day",
      start: today,
      endExclusive: addDays(today, 1),
    };
  }

  if (query.period === "week") {
    return {
      ok: true,
      period: "week",
      start: addDays(today, -6),
      endExclusive: addDays(today, 1),
    };
  }

  if (query.period === "month") {
    return {
      ok: true,
      period: "month",
      start: addDays(today, -29),
      endExclusive: addDays(today, 1),
    };
  }

  const from = query.from ? parseYmd(query.from) : null;
  const to = query.to ? parseYmd(query.to) : null;
  if (!from || !to) {
    return { ok: false, error: "Oraliq uchun from va to (YYYY-MM-DD) kerak" };
  }
  if (to < from) {
    return { ok: false, error: "to sanasi from dan oldin bo'lishi mumkin emas" };
  }

  const endExclusive = addDays(to, 1);
  const span = daysBetween(from, endExclusive);
  if (span > MAX_RANGE_DAYS) {
    return { ok: false, error: `Maksimal oralik ${MAX_RANGE_DAYS} kun` };
  }

  return { ok: true, period: "custom", start: from, endExclusive };
}

function paymentBucket(method: string | null | undefined): PaymentBucket {
  if (method === "CASH" || method === "CARD" || method === "PAYME") return method;
  return "OTHER";
}

function sourceBucket(source: string | null | undefined): SourceBucket {
  if (
    source === "QR_TABLE" ||
    source === "ONLINE" ||
    source === "WAITER" ||
    source === "CASHIER"
  ) {
    return source;
  }
  return "WAITER";
}

function orderAt(order: { paidAt: Date | null; createdAt: Date }): Date {
  return order.paidAt ?? order.createdAt;
}

export async function getReports(
  cafeId: string,
  periodOrQuery: ReportPeriod | ReportQuery = "day",
) {
  const query: ReportQuery =
    typeof periodOrQuery === "string"
      ? { period: periodOrQuery }
      : periodOrQuery;

  const range = resolveReportRange(query);
  if (!range.ok) {
    throw new Error(range.error);
  }

  const { period, start, endExclusive } = range;
  const now = new Date();

  const orders = await prisma.order.findMany({
    where: {
      cafeId,
      status: "DELIVERED",
      OR: [
        { paidAt: { gte: start, lt: endExclusive } },
        { paidAt: null, createdAt: { gte: start, lt: endExclusive } },
      ],
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              category: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalDiscount = orders.reduce((s, o) => s + o.discountAmount, 0);
  const cashRevenue = orders
    .filter((o) => o.paymentMethod === "CASH")
    .reduce((s, o) => s + o.totalAmount, 0);
  const cardRevenue = orders
    .filter((o) => o.paymentMethod === "CARD")
    .reduce((s, o) => s + o.totalAmount, 0);
  const paymeRevenue = orders
    .filter((o) => o.paymentMethod === "PAYME")
    .reduce((s, o) => s + o.totalAmount, 0);
  const otherRevenue = orders
    .filter((o) => paymentBucket(o.paymentMethod) === "OTHER")
    .reduce((s, o) => s + o.totalAmount, 0);
  const orderCount = orders.length;
  const avgCheck = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

  const byPaymentMap = new Map<PaymentBucket, { method: PaymentBucket; revenue: number; orders: number }>([
    ["CASH", { method: "CASH", revenue: 0, orders: 0 }],
    ["CARD", { method: "CARD", revenue: 0, orders: 0 }],
    ["PAYME", { method: "PAYME", revenue: 0, orders: 0 }],
    ["OTHER", { method: "OTHER", revenue: 0, orders: 0 }],
  ]);
  const bySourceMap = new Map<SourceBucket, { source: SourceBucket; revenue: number; orders: number }>([
    ["QR_TABLE", { source: "QR_TABLE", revenue: 0, orders: 0 }],
    ["ONLINE", { source: "ONLINE", revenue: 0, orders: 0 }],
    ["WAITER", { source: "WAITER", revenue: 0, orders: 0 }],
    ["CASHIER", { source: "CASHIER", revenue: 0, orders: 0 }],
  ]);

  for (const order of orders) {
    const pay = byPaymentMap.get(paymentBucket(order.paymentMethod))!;
    pay.revenue += order.totalAmount;
    pay.orders += 1;
    const src = bySourceMap.get(sourceBucket(order.source))!;
    src.revenue += order.totalAmount;
    src.orders += 1;
  }

  const productMap = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();
  const categoryMap = new Map<
    string,
    { id: string; name: string; quantity: number; revenue: number }
  >();

  for (const order of orders) {
    for (const item of order.items) {
      const key = item.productId;
      const existing = productMap.get(key) ?? {
        name: item.product.name,
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += item.quantity;
      existing.revenue += item.unitPrice * item.quantity;
      productMap.set(key, existing);

      const cat = item.product.category;
      const catKey = cat?.id ?? "_none";
      const catRow = categoryMap.get(catKey) ?? {
        id: catKey,
        name: cat?.name ?? "Kategoriyasiz",
        quantity: 0,
        revenue: 0,
      };
      catRow.quantity += item.quantity;
      catRow.revenue += item.unitPrice * item.quantity;
      categoryMap.set(catKey, catRow);
    }
  }

  const topProducts = [...productMap.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  const byCategory = [...categoryMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);

  const productsByRevenue = [...productMap.values()].sort(
    (a, b) => b.revenue - a.revenue,
  );
  const totalProductRevenue = productsByRevenue.reduce((s, p) => s + p.revenue, 0);
  let cumulativeRevenueShare = 0;
  const abcProducts = productsByRevenue.map((p) => {
    const revenueShare =
      totalProductRevenue > 0 ? (p.revenue / totalProductRevenue) * 100 : 0;
    cumulativeRevenueShare += revenueShare;
    const abcClass =
      cumulativeRevenueShare <= 80 ? "A" : cumulativeRevenueShare <= 95 ? "B" : "C";

    return {
      ...p,
      abcClass,
      revenueShare: Math.round(revenueShare * 10) / 10,
      removeCandidate: abcClass === "C" && p.quantity <= 5 && revenueShare < 3,
    };
  });

  const hourly = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: 0,
    revenue: 0,
  }));

  for (const order of orders) {
    const h = orderAt(order).getHours();
    hourly[h].count += 1;
    hourly[h].revenue += order.totalAmount;
  }

  const daily: { date: string; dateKey: string; revenue: number; orders: number }[] =
    [];

  if (period !== "day") {
    let cursor = new Date(start);
    while (cursor < endExclusive) {
      const next = addDays(cursor, 1);
      const dayOrders = orders.filter((o) => {
        const t = orderAt(o);
        return t >= cursor && t < next;
      });
      daily.push({
        dateKey: toYmd(cursor),
        date: cursor.toLocaleDateString("uz-UZ", {
          day: "numeric",
          month: "short",
        }),
        revenue: dayOrders.reduce((s, o) => s + o.totalAmount, 0),
        orders: dayOrders.length,
      });
      cursor = next;
    }
  }

  const peakHour = hourly.reduce(
    (max, h) => (h.count > max.count ? h : max),
    hourly[0],
  );

  return {
    period,
    from: toYmd(start),
    to: toYmd(addDays(endExclusive, -1)),
    summary: {
      totalRevenue,
      totalDiscount,
      cashRevenue,
      cardRevenue,
      paymeRevenue,
      otherRevenue,
      orderCount,
      avgCheck,
      peakHour: peakHour.count > 0 ? peakHour.hour : null,
    },
    byPayment: [...byPaymentMap.values()],
    bySource: [...bySourceMap.values()],
    byCategory,
    topProducts,
    abcProducts,
    hourly: hourly.filter(
      (h) => h.count > 0 || (period === "day" && h.hour <= now.getHours()),
    ),
    daily,
  };
}

const PERIOD_CSV: Record<string, string> = {
  day: "Bugun",
  week: "7 kun",
  month: "Oy (30 kun)",
  custom: "Oraliq",
};

const PAY_CSV: Record<string, string> = {
  CASH: "Naqd",
  CARD: "Karta",
  PAYME: "Payme",
  OTHER: "Boshqa",
};

const SOURCE_CSV: Record<string, string> = {
  QR_TABLE: "QR stol",
  ONLINE: "Online",
  WAITER: "Ofitsiant",
  CASHIER: "Kassir",
};

/** Excel (UZ/RU) uchun `;` ajratuvchi + tushunarli bo‘limlar */
export function reportsToCsv(
  report: Awaited<ReturnType<typeof getReports>>,
): string {
  const som = (tiyin: number) => Math.floor(tiyin / 100);
  const sep = ";";
  const lines: string[] = [];

  const cell = (value: string | number) => {
    const s = String(value);
    if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const push = (...cols: (string | number)[]) => {
    lines.push(cols.map(cell).join(sep));
  };

  const blank = () => lines.push("");
  const section = (title: string) => {
    blank();
    push(title);
  };

  push("HISOBOT");
  push("Kafe hisoboti (Excel)");
  push("Davr", PERIOD_CSV[report.period] ?? report.period);
  push("Dan", report.from);
  push("Gacha", report.to);

  section("1. XULOSA");
  push("Ko'rsatkich", "Qiymat");
  push("Jami savdo (so'm)", som(report.summary.totalRevenue));
  push("Buyurtmalar soni", report.summary.orderCount);
  push("O'rtacha chek (so'm)", som(report.summary.avgCheck));
  push("Chegirmalar (so'm)", som(report.summary.totalDiscount));
  push("Naqd (so'm)", som(report.summary.cashRevenue));
  push("Karta (so'm)", som(report.summary.cardRevenue));
  push("Payme (so'm)", som(report.summary.paymeRevenue));
  push("Boshqa to'lov (so'm)", som(report.summary.otherRevenue));
  if (report.summary.peakHour != null) {
    push("Eng band soat", `${String(report.summary.peakHour).padStart(2, "0")}:00`);
  }

  section("2. TO'LOV USULI");
  push("To'lov usuli", "Buyurtmalar", "Savdo (so'm)");
  for (const p of report.byPayment) {
    if (p.orders === 0 && p.revenue === 0) continue;
    push(PAY_CSV[p.method] ?? p.method, p.orders, som(p.revenue));
  }

  section("3. KANAL (manba)");
  push("Kanal", "Buyurtmalar", "Savdo (so'm)");
  for (const s of report.bySource) {
    if (s.orders === 0 && s.revenue === 0) continue;
    push(SOURCE_CSV[s.source] ?? s.source, s.orders, som(s.revenue));
  }

  section("4. KATEGORIYA");
  push("Kategoriya", "Soni", "Savdo (so'm)");
  if (report.byCategory.length === 0) {
    push("—", 0, 0);
  } else {
    for (const c of report.byCategory) {
      push(c.name, c.quantity, som(c.revenue));
    }
  }

  section("5. TOP MAHSULOTLAR");
  push("Mahsulot", "Soni", "Savdo (so'm)");
  if (report.topProducts.length === 0) {
    push("—", 0, 0);
  } else {
    for (const p of report.topProducts) {
      push(p.name, p.quantity, som(p.revenue));
    }
  }

  if (report.daily.length > 0) {
    section("6. KUNLIK SAVDO");
    push("Sana", "Buyurtmalar", "Savdo (so'm)");
    for (const d of report.daily) {
      push(d.dateKey, d.orders, som(d.revenue));
    }
  }

  // Excel sep= hint (ba'zi versiyalar)
  return `\uFEFFsep=${sep}\r\n` + lines.join("\r\n");
}

export async function syncTableStatusFromOrders(tableId: string) {
  const active = await prisma.order.findFirst({
    where: {
      tableId,
      status: { in: [...ACTIVE_ORDER_STATUSES] },
    },
  });

  if (active) {
    await prisma.table.update({
      where: { id: tableId },
      data: { status: "OCCUPIED" },
    });
    return "OCCUPIED" as const;
  }

  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (table?.status === "BILL_REQUESTED") return "BILL_REQUESTED" as const;

  await prisma.table.update({
    where: { id: tableId },
    data: { status: "FREE" },
  });
  return "FREE" as const;
}

export const TABLE_STATUS_LABELS: Record<string, string> = {
  FREE: "Bo'sh",
  OCCUPIED: "Band",
  BILL_REQUESTED: "Hisob so'ralgan",
};

export const TABLE_STATUS_COLORS: Record<string, string> = {
  FREE: "bg-green-100 border-green-400 text-green-800",
  OCCUPIED: "bg-amber-100 border-amber-400 text-amber-900",
  BILL_REQUESTED: "bg-red-100 border-red-400 text-red-900",
};

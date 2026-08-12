import { prisma } from "@/lib/prisma";
import { getReports } from "@/lib/reports";

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, day] = value.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getZReport(cafeId: string, dateYmd?: string) {
  const today = toYmd(new Date());
  const date = dateYmd && parseYmd(dateYmd) ? dateYmd : today;

  const report = await getReports(cafeId, {
    period: "custom",
    from: date,
    to: date,
  });

  const dayStart = parseYmd(date)!;
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const lastVariance = await prisma.cashVarianceReport.findFirst({
    where: {
      cafeId,
      createdAt: { gte: dayStart, lt: dayEnd },
    },
    orderBy: { createdAt: "desc" },
  });

  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: { name: true },
  });

  return {
    cafeName: cafe?.name ?? "Kafe",
    date,
    summary: report.summary,
    byPayment: report.byPayment,
    bySource: report.bySource,
    expectedCash: report.summary.cashRevenue,
    lastVariance: lastVariance
      ? {
          id: lastVariance.id,
          expectedCash: lastVariance.expectedCash,
          actualCash: lastVariance.actualCash,
          variance: lastVariance.variance,
          note: lastVariance.note,
          shiftLabel: lastVariance.shiftLabel,
          cashierName: lastVariance.cashierName,
          createdAt: lastVariance.createdAt.toISOString(),
        }
      : null,
  };
}

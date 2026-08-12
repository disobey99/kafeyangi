import { getReports } from "@/lib/reports";
import { sendTelegramMessage } from "@/lib/telegram";
import { prisma } from "@/lib/prisma";

export function formatDailyReportMessage(
  cafeName: string,
  report: Awaited<ReturnType<typeof getReports>>,
): string {
  const { summary, topProducts } = report;
  const periodLabel =
    report.period === "day"
      ? "Kunlik"
      : report.period === "week"
        ? "Haftalik"
        : report.period === "month"
          ? "Oylik"
          : "Oraliq";

  const lines = [
    `📊 <b>${periodLabel} hisobot</b>`,
    `🏪 ${cafeName}`,
    "",
    `💰 Savdo: <b>${Math.floor(summary.totalRevenue / 100).toLocaleString("uz-UZ")} so'm</b>`,
    `📋 Buyurtmalar: <b>${summary.orderCount}</b>`,
    `🧾 O'rtacha chek: <b>${Math.floor(summary.avgCheck / 100).toLocaleString("uz-UZ")} so'm</b>`,
    `💵 Naqd: ${Math.floor(summary.cashRevenue / 100).toLocaleString("uz-UZ")} so'm`,
    `💳 Karta: ${Math.floor(summary.cardRevenue / 100).toLocaleString("uz-UZ")} so'm`,
    `📱 Payme: ${Math.floor((summary.paymeRevenue ?? 0) / 100).toLocaleString("uz-UZ")} so'm`,
  ];

  if (summary.peakHour != null) {
    lines.push(`⏰ Eng faol soat: ${summary.peakHour}:00`);
  }

  if (topProducts.length > 0) {
    lines.push("", "<b>Top taomlar:</b>");
    for (const [i, p] of topProducts.slice(0, 5).entries()) {
      lines.push(`${i + 1}. ${p.name} — ${p.quantity} ta`);
    }
  }

  if (report.daily.length > 0) {
    lines.push("", "<b>Kunlar bo'yicha:</b>");
    for (const d of report.daily) {
      lines.push(`${d.date}: ${Math.floor(d.revenue / 100).toLocaleString("uz-UZ")} so'm (${d.orders})`);
    }
  }

  return lines.join("\n");
}

export async function sendDailyReportsForCafe(cafeId: string, period: "day" | "week" = "day") {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: { name: true, telegramChatId: true, dailyReportEnabled: true },
  });

  if (!cafe?.telegramChatId || !cafe.dailyReportEnabled) {
    return { sent: false, reason: "telegram_disabled" as const };
  }

  const report = await getReports(cafeId, period);
  const text = formatDailyReportMessage(cafe.name, report);
  const { ok } = await sendTelegramMessage(cafe.telegramChatId, text, {
    bot: "support",
  });
  return { sent: ok };
}

export async function runScheduledDailyReports() {
  const hour = new Date().getHours();
  const cafes = await prisma.cafe.findMany({
    where: {
      dailyReportEnabled: true,
      telegramChatId: { not: null },
      dailyReportHour: hour,
      status: { in: ["TRIAL", "ACTIVE"] },
    },
    select: { id: true },
  });

  let sent = 0;
  for (const cafe of cafes) {
    const result = await sendDailyReportsForCafe(cafe.id, "day");
    if (result.sent) sent += 1;
  }

  // Yakshanba kuni haftalik xulosa
  if (new Date().getDay() === 0) {
    for (const cafe of cafes) {
      await sendDailyReportsForCafe(cafe.id, "week");
    }
  }

  return { checked: cafes.length, sent };
}

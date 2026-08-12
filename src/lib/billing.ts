import { BillingStatus, CafeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlanPriceSom } from "@/lib/plan-pricing";
import { BILLING_GRACE_DAYS, BILLING_PERIOD_DAYS } from "@/lib/billing-constants";

const GRACE_DAYS = BILLING_GRACE_DAYS;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function createInvoiceForCafe(
  cafeId: string,
  opts?: { allowTrial?: boolean; startFromToday?: boolean },
) {
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe || cafe.status === "CANCELLED") return null;
  if (cafe.status === "TRIAL" && !opts?.allowTrial) return null;

  const priceSom = getPlanPriceSom(cafe.plan);
  const expectedAmount = priceSom * 100;
  const now = new Date();
  // Paddle/checkout (allowTrial): bugundan. Cron yangilash: mavjud muddat oxiridan.
  const fromToday = Boolean(opts?.startFromToday || opts?.allowTrial);
  const periodStart = fromToday
    ? now
    : cafe.subscriptionEndsAt && cafe.subscriptionEndsAt > now
      ? cafe.subscriptionEndsAt
      : now;
  const periodEnd = addDays(periodStart, BILLING_PERIOD_DAYS);

  const existing = await prisma.billingInvoice.findFirst({
    where: {
      cafeId,
      status: { in: ["PENDING", "OVERDUE"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    const needsPeriodFix =
      fromToday &&
      Math.abs(existing.periodStart.getTime() - now.getTime()) > 60_000;
    if (
      existing.amount !== expectedAmount ||
      existing.plan !== cafe.plan ||
      needsPeriodFix
    ) {
      return prisma.billingInvoice.update({
        where: { id: existing.id },
        data: {
          amount: expectedAmount,
          plan: cafe.plan,
          ...(fromToday ? { periodStart: now, periodEnd } : {}),
        },
      });
    }
    return existing;
  }

  return prisma.billingInvoice.create({
    data: {
      cafeId,
      plan: cafe.plan,
      amount: expectedAmount,
      periodStart,
      periodEnd,
      status: "PENDING",
    },
  });
}

/** Kutilayotgan / muddati o'tgan hisob-fakturani bekor qilish */
export async function cancelInvoice(invoiceId: string, cafeId: string) {
  const invoice = await prisma.billingInvoice.findFirst({
    where: {
      id: invoiceId,
      cafeId,
      status: { in: ["PENDING", "OVERDUE"] },
    },
  });
  if (!invoice) {
    return { error: "Bekor qilish mumkin emas — faktura topilmadi yoki allaqachon yopilgan" as const };
  }

  await prisma.billingInvoice.delete({ where: { id: invoice.id } });
  return { ok: true as const };
}

/** Eski so'm summalarini joriy tarif narxiga moslash */
export async function reconcilePendingInvoiceAmounts(cafeId: string) {
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) return;

  const expectedAmount = getPlanPriceSom(cafe.plan) * 100;
  await prisma.billingInvoice.updateMany({
    where: {
      cafeId,
      status: { in: ["PENDING", "OVERDUE"] },
      amount: { not: expectedAmount },
    },
    data: { amount: expectedAmount, plan: cafe.plan },
  });
}

export async function payInvoice(invoiceId: string) {
  const invoice = await prisma.billingInvoice.findUnique({
    where: { id: invoiceId },
    include: { cafe: true },
  });
  if (!invoice || invoice.status === "PAID") {
    return { error: "Hisob-faktura topilmadi yoki allaqachon to'langan" as const };
  }

  const now = new Date();
  const durationMs = Math.max(
    BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    invoice.periodEnd.getTime() - invoice.periodStart.getTime(),
  );
  // Invoice kelajakdan boshlansa (erta yangilash) — stack; aks holda bugundan
  const start = invoice.periodStart > now ? invoice.periodStart : now;
  const newEnd = new Date(start.getTime() + durationMs);
  const paidPeriodStart = start;
  const paidPeriodEnd = newEnd;

  await prisma.$transaction([
    prisma.billingInvoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID",
        paidAt: now,
        periodStart: paidPeriodStart,
        periodEnd: paidPeriodEnd,
      },
    }),
    prisma.cafe.update({
      where: { id: invoice.cafeId },
      data: {
        status: "ACTIVE",
        plan: invoice.plan,
        subscriptionEndsAt: newEnd,
        suspendReason: null,
      },
    }),
  ]);

  return { ok: true as const, subscriptionEndsAt: newEnd };
}

export async function runBillingCycle() {
  const now = new Date();
  const results = {
    invoicesCreated: 0,
    markedOverdue: 0,
    suspended: 0,
    trialReminders: 0,
  };

  const cafes = await prisma.cafe.findMany({
    where: { status: { in: ["ACTIVE", "SUSPENDED"] } },
  });

  for (const cafe of cafes) {
    const endsAt = cafe.subscriptionEndsAt;
    if (!endsAt) continue;

    const daysLeft = (endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

    if (daysLeft <= 3) {
      const invoice = await createInvoiceForCafe(cafe.id);
      if (invoice && invoice.createdAt.getTime() > now.getTime() - 5000) {
        results.invoicesCreated++;
      }
    }

    const overdueInvoice = await prisma.billingInvoice.findFirst({
      where: {
        cafeId: cafe.id,
        status: "PENDING",
        periodEnd: { lt: now },
      },
    });

    if (overdueInvoice) {
      await prisma.billingInvoice.update({
        where: { id: overdueInvoice.id },
        data: { status: "OVERDUE" },
      });
      results.markedOverdue++;
    }

    const graceEnd = addDays(endsAt, GRACE_DAYS);
    if (now > graceEnd && cafe.status === "ACTIVE") {
      await prisma.cafe.update({
        where: { id: cafe.id },
        data: { status: "SUSPENDED", suspendReason: "BILLING" },
      });
      results.suspended++;
    }
  }

  const expiredTrials = await prisma.cafe.findMany({
    where: {
      status: "TRIAL",
      trialEndsAt: { lt: now },
    },
  });

  for (const cafe of expiredTrials) {
    await prisma.cafe.update({
      where: { id: cafe.id },
      data: { status: "SUSPENDED", suspendReason: "TRIAL" },
    });
    results.suspended++;
  }

  // 3 kun qolganda — faqat profil ulangan egaga (support bot)
  const { sendSubscriptionExpiryWarnings } = await import(
    "@/lib/telegram-support-bot"
  );
  results.trialReminders = await sendSubscriptionExpiryWarnings();

  return results;
}

export async function getCafeInvoices(cafeId: string) {
  return prisma.billingInvoice.findMany({
    where: { cafeId },
    orderBy: { createdAt: "desc" },
    take: 24,
  });
}

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  PENDING: "Kutilmoqda",
  PAID: "To'langan",
  FAILED: "Xatolik",
  OVERDUE: "Muddati o'tgan",
};

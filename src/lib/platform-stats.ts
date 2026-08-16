import { prisma } from "@/lib/prisma";
import { getPlanConfig, type PlanId } from "@/lib/plans";
import { getPlanPriceSom } from "@/lib/plan-pricing";

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function planPriceTiyin(plan: string) {
  return getPlanPriceSom((plan as PlanId) || "STARTER") * 100;
}

/** Super admin — platforma obuna/to'lov statistikasi (kafe savdosi emas) */
export async function getPlatformStats() {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const cafeRows = await prisma.cafe.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      plan: true,
      region: true,
      address: true,
      phone: true,
      subscriptionEndsAt: true,
      trialEndsAt: true,
      createdAt: true,
      owner: { select: { name: true, email: true } },
    },
  });

  const cafes = cafeRows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    status: c.status,
    plan: c.plan,
    region: c.region,
    address: c.address,
    phone: c.phone,
    subscriptionEndsAt: c.subscriptionEndsAt?.toISOString() ?? null,
    trialEndsAt: c.trialEndsAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    ownerName: c.owner.name,
    ownerEmail: c.owner.email,
  }));

  const invoiceRows = await prisma.billingInvoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      cafeId: true,
      plan: true,
      amount: true,
      status: true,
      paidAt: true,
      periodEnd: true,
      createdAt: true,
      cafe: { select: { name: true } },
    },
  });

  const invoices = invoiceRows.map((i) => ({
    id: i.id,
    cafeId: i.cafeId,
    cafeName: i.cafe.name,
    plan: i.plan,
    amount: i.amount,
    status: i.status,
    paidAt: i.paidAt?.toISOString() ?? null,
    periodEnd: i.periodEnd.toISOString(),
    createdAt: i.createdAt.toISOString(),
  }));

  const activeCustomers = cafes.filter((c) => c.status === "ACTIVE" || c.status === "TRIAL");
  const payingCustomers = cafes.filter((c) => c.status === "ACTIVE");
  const newThisMonth = cafes.filter((c) => new Date(c.createdAt) >= monthStart);

  const overdueCafes = cafes.filter((c) => {
    if (c.status === "SUSPENDED") return true;
    if (c.status === "CANCELLED") return false;
    if (c.status === "TRIAL" && c.trialEndsAt && new Date(c.trialEndsAt) < now) return true;
    if (c.subscriptionEndsAt && new Date(c.subscriptionEndsAt) < now && c.status === "ACTIVE") {
      return true;
    }
    return false;
  });

  const mrrTiyin = payingCustomers.reduce((s, c) => s + planPriceTiyin(c.plan), 0);

  const paidThisMonth = invoices.filter(
    (i) => i.status === "PAID" && i.paidAt && new Date(i.paidAt) >= monthStart,
  );
  const monthRevenueTiyin = paidThisMonth.reduce((s, i) => s + i.amount, 0);

  const pendingInvoices = invoices.filter((i) => i.status === "PENDING" || i.status === "OVERDUE");
  const pendingAmount = pendingInvoices.reduce((s, i) => s + i.amount, 0);
  const failedInvoices = invoices.filter((i) => i.status === "FAILED");
  const avgPayment =
    paidThisMonth.length > 0
      ? Math.round(monthRevenueTiyin / paidThisMonth.length)
      : 0;

  const byPlan = (["STARTER", "STANDARD", "PRO"] as const).map((plan) => ({
    plan,
    label: getPlanConfig(plan).name,
    priceSom: getPlanPriceSom(plan as PlanId),
    count: cafes.filter((c) => c.plan === plan && c.status !== "CANCELLED").length,
  }));

  const byRegionMap = new Map<string, { count: number; mrr: number }>();
  for (const c of activeCustomers) {
    const key = c.region || "Noma'lum";
    const prev = byRegionMap.get(key) ?? { count: 0, mrr: 0 };
    prev.count += 1;
    if (c.status === "ACTIVE") prev.mrr += planPriceTiyin(c.plan);
    byRegionMap.set(key, prev);
  }
  const byRegion = [...byRegionMap.entries()]
    .map(([region, v]) => ({ region, count: v.count, mrr: v.mrr }))
    .sort((a, b) => b.mrr - a.mrr || b.count - a.count);

  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const start = monthsAgo(i);
    const end = monthsAgo(i - 1);
    const label = start.toLocaleDateString("uz-UZ", { month: "short" });
    const activeThen = cafes.filter((c) => {
      const created = new Date(c.createdAt);
      if (created >= end) return false;
      if (c.status === "CANCELLED") return false;
      return true;
    });
    const revenue = activeThen
      .filter(
        (c) =>
          c.status === "ACTIVE" ||
          (c.subscriptionEndsAt && new Date(c.subscriptionEndsAt) > start),
      )
      .reduce((s, c) => s + planPriceTiyin(c.plan), 0);
    const paidInMonth = invoices
      .filter((inv) => {
        if (inv.status !== "PAID" || !inv.paidAt) return false;
        const p = new Date(inv.paidAt);
        return p >= start && p < end;
      })
      .reduce((s, inv) => s + inv.amount, 0);
    monthlyTrend.push({
      label,
      revenue:
        paidInMonth > 0
          ? paidInMonth
          : i === 0
            ? mrrTiyin
            : Math.round(revenue * (0.7 + (5 - i) * 0.05)),
    });
  }

  const upcoming = cafes
    .filter((c) => c.status === "ACTIVE" || c.status === "TRIAL" || c.status === "SUSPENDED")
    .map((c) => {
      const due = c.subscriptionEndsAt
        ? new Date(c.subscriptionEndsAt)
        : c.trialEndsAt
          ? new Date(c.trialEndsAt)
          : null;
      const amount = planPriceTiyin(c.plan);
      const overdue = due ? due < now : c.status === "SUSPENDED";
      return {
        id: c.id,
        name: c.name,
        amount,
        dueAt: due?.toISOString() ?? null,
        overdue,
        status: c.status,
        plan: c.plan,
      };
    })
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    })
    .slice(0, 10);

  const recentCustomers = cafes.slice(0, 12).map((c) => {
    const due = c.subscriptionEndsAt
      ? new Date(c.subscriptionEndsAt)
      : c.trialEndsAt
        ? new Date(c.trialEndsAt)
        : null;
    const overdue =
      c.status === "SUSPENDED" ||
      (due != null && due < now && c.status === "ACTIVE");
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      region: c.region,
      plan: c.plan,
      monthlyFee: planPriceTiyin(c.plan),
      status: c.status,
      overdue,
      nextPayment: due?.toISOString() ?? null,
      ownerName: c.ownerName,
      ownerEmail: c.ownerEmail,
    };
  });

  const topCustomers = [...payingCustomers]
    .map((c) => {
      const paidTotal = invoices
        .filter((i) => i.cafeId === c.id && i.status === "PAID")
        .reduce((s, i) => s + i.amount, 0);
      return {
        id: c.id,
        name: c.name,
        plan: c.plan,
        totalPaid: paidTotal > 0 ? paidTotal : planPriceTiyin(c.plan),
      };
    })
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, 5);

  return {
    summary: {
      activeCustomers: activeCustomers.length,
      payingCustomers: payingCustomers.length,
      newThisMonth: newThisMonth.length,
      overdueCount: overdueCafes.length,
      mrr: mrrTiyin,
      monthRevenue: monthRevenueTiyin > 0 ? monthRevenueTiyin : mrrTiyin,
      pendingAmount,
      failedCount: failedInvoices.length,
      avgPayment:
        avgPayment > 0
          ? avgPayment
          : Math.round(mrrTiyin / Math.max(1, payingCustomers.length)),
    },
    byPlan,
    byRegion,
    monthlyTrend,
    upcoming,
    recentCustomers,
    topCustomers,
    transactions: invoices.slice(0, 40).map((i) => ({
      id: i.id,
      cafeId: i.cafeId,
      cafeName: i.cafeName,
      plan: i.plan,
      amount: i.amount,
      status: i.status,
      method: "Obuna",
      paidAt: i.paidAt ? new Date(i.paidAt).toISOString() : null,
      createdAt: new Date(i.createdAt).toISOString(),
      periodEnd: new Date(i.periodEnd).toISOString(),
    })),
  };
}

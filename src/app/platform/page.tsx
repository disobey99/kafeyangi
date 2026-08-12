import Link from "next/link";
import { Plus } from "lucide-react";
import {
  maskPlatformMoney,
  shouldHidePlatformRevenue,
} from "@/lib/platform-permissions";
import { getPlatformAccessPermissions } from "@/lib/platform-permissions-server";
import { requirePlatformMenu } from "@/lib/session-guard";
import { getPlatformStats } from "@/lib/platform-stats";
import { getPlanCurrency } from "@/lib/plan-pricing";
import { planLabel, formatPlanCents, type PlanId } from "@/lib/plans";

export default async function PlatformDashboard() {
  const session = await requirePlatformMenu("menu.dashboard");
  const perms = await getPlatformAccessPermissions(session);
  const hideMoney = shouldHidePlatformRevenue(perms);
  const stats = await getPlatformStats();
  const currency = getPlanCurrency();
  const maxTrend = Math.max(1, ...stats.monthlyTrend.map((m) => m.revenue));
  const maxPlan = Math.max(1, ...stats.byPlan.map((p) => p.count));
  const money = (cents: number) =>
    maskPlatformMoney(formatPlanCents(cents, currency), hideMoney);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="platform-title text-2xl font-bold tracking-tight">Bosh admin panel</h1>
          <p className="platform-muted mt-1">
            Ijaraga berilgan kafe va restoranlarni shu yerdan boshqaring
          </p>
        </div>
        <Link
          href="/platform/cafes"
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 dark:bg-violet-500 dark:shadow-violet-900/40 dark:hover:bg-violet-400"
        >
          <Plus className="h-4 w-4" />
          Mijozlar
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Faol mijozlar"
          value={`${stats.summary.activeCustomers} ta`}
          hint={`+${stats.summary.newThisMonth} shu oy`}
          hintClass="text-emerald-600"
        />
        <Kpi
          label="Oylik daromad (MRR)"
          value={money(stats.summary.mrr)}
          hint="Faol obunalar"
          hintClass="text-emerald-600"
        />
        <Kpi
          label="Yangi mijozlar"
          value={`${stats.summary.newThisMonth} ta`}
          hint="shu oy ichida"
        />
        <Kpi
          label="Muddati o'tgan to'lovlar"
          value={`${stats.summary.overdueCount} ta`}
          hint="e'tibor talab qiladi"
          hintClass="text-red-600"
          danger
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="platform-card p-5">
          <h2 className="platform-title font-bold">Oylik daromad dinamikasi</h2>
          <div className="mt-6 flex h-44 items-end gap-3">
            {stats.monthlyTrend.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-violet-700 to-violet-400 dark:from-violet-600 dark:to-fuchsia-400"
                  style={{
                    height: hideMoney
                      ? "70px"
                      : `${Math.max(12, (m.revenue / maxTrend) * 140)}px`,
                  }}
                  title={money(m.revenue)}
                />
                <span className="platform-muted text-xs font-medium">{m.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="platform-card p-5">
          <h2 className="platform-title font-bold">Tarif rejalari bo&apos;yicha mijozlar</h2>
          <ul className="mt-6 space-y-4">
            {stats.byPlan.map((p) => (
              <li key={p.plan}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="platform-muted font-medium">{p.label}</span>
                  <span className="platform-title font-bold">{p.count}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-stone-100 dark:bg-white/5">
                  <div
                    className={`h-full rounded-full ${
                      p.plan === "STARTER"
                        ? "bg-sky-400"
                        : p.plan === "STANDARD"
                          ? "bg-violet-500"
                          : "bg-amber-400"
                    }`}
                    style={{ width: `${(p.count / maxPlan) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {stats.summary.overdueCount > 0 && (
        <div className="platform-card platform-card-danger mt-6 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-sm font-semibold text-red-800 dark:text-red-200">
            {stats.summary.overdueCount} ta mijozning to&apos;lov muddati o&apos;tib ketgan
          </p>
          <Link
            href="/platform/payments"
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-500"
          >
            To&apos;lovlarga o&apos;tish
          </Link>
        </div>
      )}

      <section className="platform-card mt-6 p-5">
        <h2 className="platform-title font-bold">So&apos;nggi mijozlar</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="platform-muted">
                <th className="pb-3 font-medium">Kafe / Restoran</th>
                <th className="pb-3 font-medium">Shahar</th>
                <th className="pb-3 font-medium">Tarif</th>
                <th className="pb-3 font-medium">Oylik to&apos;lov</th>
                <th className="pb-3 font-medium">Holati</th>
                <th className="pb-3 font-medium">Keyingi to&apos;lov</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentCustomers.map((c) => (
                <tr key={c.id} className="border-t border-stone-100 dark:border-white/10">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                        {c.name.slice(0, 1)}
                      </span>
                      <div>
                        <p className="platform-title font-semibold">{c.name}</p>
                        <p className="platform-muted text-xs">{c.ownerName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="platform-muted py-3">{c.region || "—"}</td>
                  <td className="py-3">{planLabel(c.plan as PlanId)}</td>
                  <td className="py-3 font-medium">{money(c.monthlyFee)}</td>
                  <td className="py-3">
                    <CustomerStatus status={c.status} overdue={c.overdue} />
                  </td>
                  <td className="platform-muted py-3">
                    {c.nextPayment
                      ? new Date(c.nextPayment).toLocaleDateString("uz-UZ", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  hintClass = "platform-muted",
  danger,
}: {
  label: string;
  value: string;
  hint: string;
  hintClass?: string;
  danger?: boolean;
}) {
  return (
    <div className={`platform-card p-5 ${danger ? "platform-card-danger" : ""}`}>
      <p className="platform-muted text-sm">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${danger ? "text-red-600 dark:text-red-400" : "platform-title"}`}>
        {value}
      </p>
      <p className={`mt-1 text-xs font-medium ${hintClass}`}>{hint}</p>
    </div>
  );
}

function CustomerStatus({ status, overdue }: { status: string; overdue: boolean }) {
  if (overdue) {
    return <span className="font-semibold text-red-600">Muddati o&apos;tgan</span>;
  }
  if (status === "TRIAL") {
    return <span className="font-semibold text-amber-600">Sinov muddatida</span>;
  }
  if (status === "ACTIVE") {
    return <span className="font-semibold text-emerald-600">Faol</span>;
  }
  if (status === "SUSPENDED") {
    return <span className="font-semibold text-red-600">Bloklangan</span>;
  }
  return <span className="text-stone-500">{status}</span>;
}

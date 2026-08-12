import {
  maskPlatformMoney,
  shouldHidePlatformRevenue,
} from "@/lib/platform-permissions";
import { getPlatformAccessPermissions } from "@/lib/platform-permissions-server";
import { requirePlatformMenu } from "@/lib/session-guard";
import { getPlatformStats } from "@/lib/platform-stats";
import { getPlanCurrency } from "@/lib/plan-pricing";
import { planLabel, formatPlanCents, type PlanId } from "@/lib/plans";
import { PlatformPaymentsClient } from "@/components/platform-payments-client";

export default async function PlatformPaymentsPage() {
  const session = await requirePlatformMenu("menu.payments");
  const perms = await getPlatformAccessPermissions(session);
  const hideMoney = shouldHidePlatformRevenue(perms);
  const stats = await getPlatformStats();
  const currency = getPlanCurrency();
  const money = (cents: number) =>
    maskPlatformMoney(formatPlanCents(cents, currency), hideMoney);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">To&apos;lovlar va obunalar</h1>
          <p className="mt-1 text-stone-500">
            Barcha mijozlardan kelgan obuna to&apos;lovlarini shu yerdan kuzating
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Shu oydagi tushum" value={money(stats.summary.monthRevenue)} />
        <Card label="Kutilayotgan to'lovlar" value={money(stats.summary.pendingAmount)} />
        <Card
          label="Muvaffaqiyatsiz to'lovlar"
          value={`${stats.summary.failedCount} ta`}
          danger={stats.summary.failedCount > 0}
        />
        <Card label="O'rtacha to'lov" value={money(stats.summary.avgPayment)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <PlatformPaymentsClient
          transactions={stats.transactions}
          currency={currency}
          hideMoney={hideMoney}
        />

        <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
          <h2 className="font-bold text-stone-900">Yaqinda to&apos;lanishi kerak</h2>
          <ul className="mt-4 space-y-3">
            {stats.upcoming.length === 0 ? (
              <li className="text-sm text-stone-400">Hozircha yo&apos;q</li>
            ) : (
              stats.upcoming.map((u) => (
                <li
                  key={u.id}
                  className="rounded-xl border border-stone-100 bg-stone-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-stone-900">{u.name}</p>
                      <p className="text-xs text-stone-500">
                        {planLabel(u.plan as PlanId)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-stone-900">{money(u.amount)}</p>
                  </div>
                  <p
                    className={`mt-2 text-xs font-medium ${
                      u.overdue ? "text-red-600" : "text-stone-500"
                    }`}
                  >
                    {u.overdue ? "Muddati o'tgan — " : ""}
                    {u.dueAt
                      ? new Date(u.dueAt).toLocaleDateString("uz-UZ", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "Sana yo'q"}
                  </p>
                </li>
              ))
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
      <p className="text-sm text-stone-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${danger ? "text-red-600" : "text-stone-900"}`}>
        {value}
      </p>
    </div>
  );
}

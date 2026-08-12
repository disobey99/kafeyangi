import {
  maskPlatformMoney,
  shouldHidePlatformRevenue,
} from "@/lib/platform-permissions";
import { getPlatformAccessPermissions } from "@/lib/platform-permissions-server";
import { requirePlatformMenu } from "@/lib/session-guard";
import { getPlatformStats } from "@/lib/platform-stats";
import { getPlanCurrency } from "@/lib/plan-pricing";
import { planLabel, formatPlanCents, formatSom, type PlanId } from "@/lib/plans";

export default async function PlatformReportsPage() {
  const session = await requirePlatformMenu("menu.reports");
  const perms = await getPlatformAccessPermissions(session);
  const hideMoney = shouldHidePlatformRevenue(perms);
  const stats = await getPlatformStats();
  const currency = getPlanCurrency();
  const maxRegion = Math.max(1, ...stats.byRegion.map((r) => r.mrr));
  const maxTrend = Math.max(1, ...stats.monthlyTrend.map((m) => m.revenue));
  const money = (cents: number) =>
    maskPlatformMoney(formatPlanCents(cents, currency), hideMoney);
  const planPrice = (priceSom: number) =>
    maskPlatformMoney(formatSom(priceSom, currency), hideMoney);

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Hisobotlar</h1>
      <p className="mt-1 text-stone-500">
        Platforma daromadi, hududlar va eng yirik mijozlar
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="MRR" value={money(stats.summary.mrr)} />
        <Card label="Shu oy tushum" value={money(stats.summary.monthRevenue)} />
        <Card label="Faol mijozlar" value={`${stats.summary.activeCustomers} ta`} />
        <Card label="Muddati o'tgan" value={`${stats.summary.overdueCount} ta`} danger />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100">
          <h2 className="font-bold text-stone-900">Oylik daromad dinamikasi</h2>
          <div className="mt-6 flex h-48 items-end gap-3">
            {stats.monthlyTrend.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg bg-violet-500"
                  style={{
                    height: hideMoney
                      ? "80px"
                      : `${Math.max(12, (m.revenue / maxTrend) * 150)}px`,
                  }}
                  title={money(m.revenue)}
                />
                <span className="text-xs text-stone-500">{m.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100">
          <h2 className="font-bold text-stone-900">Shaharlar bo&apos;yicha daromad (MRR)</h2>
          <ul className="mt-5 space-y-3">
            {stats.byRegion.slice(0, 8).map((r) => (
              <li key={r.region}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{r.region}</span>
                  <span className="font-bold">{money(r.mrr)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{
                      width: hideMoney ? "50%" : `${(r.mrr / maxRegion) * 100}%`,
                    }}
                  />
                </div>
                <p className="mt-0.5 text-xs text-stone-400">{r.count} mijoz</p>
              </li>
            ))}
            {stats.byRegion.length === 0 && (
              <p className="text-sm text-stone-400">Hududlar belgilanmagan</p>
            )}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100">
        <h2 className="font-bold text-stone-900">Eng yirik mijozlar</h2>
        <ol className="mt-4 space-y-3">
          {stats.topCustomers.map((c, i) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-stone-900">{c.name}</p>
                  <p className="text-xs text-stone-500">{planLabel(c.plan as PlanId)}</p>
                </div>
              </div>
              <p className="font-bold text-stone-900">{money(c.totalPaid)}</p>
            </li>
          ))}
          {stats.topCustomers.length === 0 && (
            <p className="text-sm text-stone-400">Ma&apos;lumot yo&apos;q</p>
          )}
        </ol>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100">
        <h2 className="font-bold text-stone-900">Tarif bo&apos;yicha mijozlar</h2>
        <ul className="mt-4 space-y-3">
          {stats.byPlan.map((p) => (
            <li key={p.plan} className="flex justify-between text-sm">
              <span>
                {p.label}{" "}
                <span className="text-stone-400">({planPrice(p.priceSom)}/oy)</span>
              </span>
              <span className="font-bold">{p.count} ta</span>
            </li>
          ))}
        </ul>
      </section>
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

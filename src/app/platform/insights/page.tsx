import {
  maskPlatformMoney,
  shouldHidePlatformRevenue,
} from "@/lib/platform-permissions";
import { getPlatformAccessPermissions } from "@/lib/platform-permissions-server";
import { requirePlatformMenu } from "@/lib/session-guard";
import { getPlatformCafeInsights } from "@/lib/platform-insights";
import { formatPrice } from "@/lib/utils";

export default async function PlatformInsightsPage() {
  const session = await requirePlatformMenu("menu.insights");
  const perms = await getPlatformAccessPermissions(session);
  const hideMoney = shouldHidePlatformRevenue(perms);
  const data = await getPlatformCafeInsights();
  const money = (value: string | number) =>
    maskPlatformMoney(
      typeof value === "number" ? formatPrice(value) : value,
      hideMoney,
    );

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Mijozlar tahlili</h1>
      <p className="mt-1 text-stone-500">
        Savdo dinamikasi va funksiyalardan foydalanish
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Jami mijoz" value={String(data.summary.totalCafes)} />
        <Card label="Bugungi savdo" value={money(data.summary.formattedTodayRevenue)} />
        <Card label="O'sayotgan" value={String(data.summary.rising)} tone="up" />
        <Card label="Pasayotgan" value={String(data.summary.falling)} tone="down" />
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100">
          <h2 className="font-bold text-stone-900">Ko&apos;p ishlatiladigan imkoniyatlar</h2>
          <ul className="mt-4 space-y-2">
            {data.topFeatures.map((f) => (
              <li
                key={f.key}
                className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-500/15"
              >
                <span className="font-medium text-stone-800 dark:text-stone-100">{f.label}</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {f.adoptionPercent}%
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100">
          <h2 className="font-bold text-stone-900">Kam ishlatiladigan imkoniyatlar</h2>
          <ul className="mt-4 space-y-2">
            {data.unusedFeatures.map((f) => (
              <li
                key={f.key}
                className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm dark:bg-amber-500/15"
              >
                <span className="font-medium text-stone-800 dark:text-stone-100">{f.label}</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  {f.adoptionPercent}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-stone-100">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Kafe</th>
              <th className="px-4 py-3 font-medium">Hudud</th>
              <th className="px-4 py-3 font-medium">Bugun</th>
              <th className="px-4 py-3 font-medium">Kecha</th>
              <th className="px-4 py-3 font-medium">7 kun</th>
              <th className="px-4 py-3 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {data.cafes.map((c) => (
              <tr key={c.id} className="border-t border-stone-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-stone-900">{c.name}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {c.todayOrders} buyurtma
                  </p>
                </td>
                <td className="px-4 py-3 text-stone-600">{c.region || "—"}</td>
                <td className="px-4 py-3 font-semibold text-stone-900">
                  {money(c.todayRevenue)}
                </td>
                <td className="px-4 py-3 text-stone-700">
                  {money(c.yesterdayRevenue)}
                </td>
                <td className="px-4 py-3 text-stone-700">
                  {money(c.weekRevenue)}
                </td>
                <td className="px-4 py-3">
                  <TrendBadge trend={c.trend} percent={c.trendPercent} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">{label}</p>
      <p
        className={`mt-2 text-2xl font-extrabold ${
          tone === "up"
            ? "text-emerald-600"
            : tone === "down"
              ? "text-red-600"
              : "text-stone-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TrendBadge({
  trend,
  percent,
}: {
  trend: "up" | "down" | "flat";
  percent: number;
}) {
  const cls =
    trend === "up"
      ? "bg-emerald-100 text-emerald-700"
      : trend === "down"
        ? "bg-red-100 text-red-700"
        : "bg-stone-100 text-stone-600";
  const label =
    trend === "up" ? `+${percent}%` : trend === "down" ? `${percent}%` : "Barqaror";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{label}</span>;
}

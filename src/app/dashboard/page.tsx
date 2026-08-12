import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  ChefHat,
  ExternalLink,
  LayoutGrid,
  Map,
  QrCode,
  Smartphone,
  UtensilsCrossed,
  Volume2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session-guard";
import { formatPrice } from "@/lib/utils";
import { MenuSetupBanner } from "@/components/menu-setup-banner";
import { StatCard } from "@/components/ui/stat-card";

const steps = [
  { n: 1, text: "Kassa oching, ovozni yoqing", icon: Volume2 },
  { n: 2, text: "QR menyudan buyurtma bering", icon: QrCode },
  { n: 3, text: "Kassada qabul qiling", icon: Wallet },
  { n: 4, text: "Oshxonada tayyor qiling", icon: ChefHat },
] as const;

type QuickLink = {
  href: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  iconClass: string;
  external?: boolean;
};

export default async function DashboardHome() {
  const session = await requireAuth();

  const cafe = await prisma.cafe.findFirst({
    where: {
      OR: [
        { ownerId: session.userId },
        { members: { some: { userId: session.userId, isActive: true } } },
      ],
    },
    include: {
      _count: { select: { products: true, tables: true, orders: true } },
      orders: {
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        select: { totalAmount: true, status: true },
      },
    },
  });

  if (!cafe) {
    return (
      <div className="dp-card rounded-2xl p-10 text-center">
        <p className="text-4xl">☕</p>
        <h1 className="mt-4 text-xl font-bold text-[var(--dp-text)]">Kafe topilmadi</h1>
        <p className="mt-2 text-sm text-[var(--dp-muted)]">
          Sizga biriktirilgan kafe yo&apos;q. Platforma admin bilan bog&apos;laning.
        </p>
      </div>
    );
  }

  const todayRevenue = cafe.orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const todayOrders = cafe.orders.length;

  const quickLinks: QuickLink[] = [
    {
      href: `/dashboard/${cafe.id}/menu`,
      title: "Menyu",
      desc: "Taomlar va narxlar",
      icon: UtensilsCrossed,
      iconClass: "dp-icon-orange",
    },
    {
      href: `/dashboard/${cafe.id}/tables`,
      title: "Stollar va QR",
      desc: "QR kodlar",
      icon: LayoutGrid,
      iconClass: "dp-icon-violet",
    },
    {
      href: `/cashier/${cafe.id}`,
      title: "Kassa",
      desc:
        cafe._count.products === 0
          ? "Menyu bo'sh — avval taom qo'shing"
          : "Buyurtmalar va to'lov",
      icon: Wallet,
      iconClass: "dp-icon-emerald",
    },
    {
      href: `/dashboard/${cafe.id}/reports`,
      title: "Hisobotlar",
      desc: "Savdo statistikasi",
      icon: BarChart3,
      iconClass: "dp-icon-blue",
    },
    {
      href: `/dashboard/${cafe.id}/floor`,
      title: "Zal sxemasi",
      desc: "Stol holati",
      icon: Map,
      iconClass: "dp-icon-cyan",
    },
    {
      href: `/c/${cafe.slug}`,
      title: "Mijoz menyusi",
      desc: "Onlayn ko'rish",
      icon: Smartphone,
      iconClass: "dp-icon-pink",
      external: true,
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--dp-accent)]">
            Bosh sahifa
          </p>
          <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-[var(--dp-text)] sm:text-3xl">
            {cafe.name}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--dp-muted)]">
            Bugungi ko&apos;rsatkichlar va tez havolalar
          </p>
        </div>
        <Link
          href={`/c/${cafe.slug}`}
          target="_blank"
          className="dp-card inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--dp-subtle)] transition hover:border-[var(--dp-accent)] hover:text-[var(--dp-accent)]"
        >
          Mijoz menyusi
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </header>

      {cafe._count.products === 0 && (
        <MenuSetupBanner cafeId={cafe.id} productCount={0} />
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
        <StatCard label="Bugungi savdo" value={formatPrice(todayRevenue)} icon="revenue" accent="green" />
        <StatCard label="Bugungi buyurtmalar" value={String(todayOrders)} icon="orders" accent="amber" />
        <StatCard
          label="Mahsulotlar"
          value={String(cafe._count.products)}
          icon="products"
          trend={`${cafe._count.tables} ta stol`}
          accent="blue"
        />
      </section>

      <section className="dp-card overflow-hidden rounded-2xl">
        <div
          className="border-b px-6 py-4"
          style={{ borderColor: "var(--dp-border-subtle)", background: "var(--dp-card-header)" }}
        >
          <h2 className="font-semibold text-[var(--dp-text)]">Tez boshlash</h2>
          <p className="mt-0.5 text-sm text-[var(--dp-muted)]">
            4 qadamda tizimni sinab ko&apos;ring
          </p>
        </div>
        <ol className="grid grid-cols-1 divide-y divide-[var(--dp-border-subtle)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.n} className="flex items-center gap-3 px-5 py-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-sm font-bold text-white shadow-sm">
                  {step.n}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-[var(--dp-subtle)]">{step.text}</p>
                </div>
                <Icon
                  className="hidden h-4 w-4 shrink-0 opacity-40 sm:block"
                  style={{ color: "var(--dp-muted)" }}
                  strokeWidth={1.75}
                />
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2 className="font-semibold text-[var(--dp-text)]">Tez havolalar</h2>
        <p className="mt-0.5 text-sm text-[var(--dp-muted)]">
          Eng ko&apos;p ishlatiladigan bo&apos;limlar
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                className="dp-card group flex items-start gap-4 rounded-2xl p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--dp-accent)]"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105 ${link.iconClass}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate font-semibold text-[var(--dp-text)]">{link.title}</p>
                    {link.external && (
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--dp-muted)]" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--dp-muted)]">{link.desc}</p>
                </div>
                <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 opacity-30 transition group-hover:text-[var(--dp-accent)] group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

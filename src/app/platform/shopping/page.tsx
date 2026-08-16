import Link from "next/link";
import {
  ClipboardList,
  ExternalLink,
  Package,
  Percent,
  ShoppingBag,
  Tags,
  Warehouse,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePlatformMenu } from "@/lib/session-guard";
import { getShopStats } from "@/lib/shop-admin";

export default async function PlatformShoppingPage() {
  await requirePlatformMenu("menu.shopping");
  let stats = {
    categories: 0,
    products: 0,
    activeProducts: 0,
    drafts: 0,
    discounts: 0,
    lowStock: 0,
  };
  let newOrders = 0;
  try {
    stats = await getShopStats();
  } catch {
    /* jadval hali yo‘q bo‘lishi mumkin */
  }
  try {
    newOrders = await prisma.shopOrder.count({ where: { status: "NEW" } });
  } catch {
    newOrders = 0;
  }

  const cards = [
    {
      label: "Yangi buyurtmalar",
      value: newOrders,
      href: "/platform/shopping/orders",
    },
    { label: "Mahsulotlar", value: stats.products, href: "/platform/shopping/products" },
    { label: "Sotuvda", value: stats.activeProducts, href: "/platform/shopping/products" },
    { label: "Qoralama", value: stats.drafts, href: "/platform/shopping/products" },
    { label: "Kategoriyalar", value: stats.categories, href: "/platform/shopping/categories" },
    { label: "Faol chegirmalar", value: stats.discounts, href: "/platform/shopping/discounts" },
    { label: "Kam qoldiq (≤5)", value: stats.lowStock, href: "/platform/shopping/products" },
  ];

  const links = [
    {
      href: "/platform/shopping/orders",
      title: "Buyurtmalar",
      desc: "Yangi buyurtmalar, telefon, status",
      icon: ClipboardList,
    },
    {
      href: "/platform/shopping/stock",
      title: "Ombor",
      desc: "Kirim, chiqim, jurnal, kam qoldiq",
      icon: Warehouse,
    },
    {
      href: "/platform/shopping/products",
      title: "Mahsulotlar",
      desc: "Tovar qo‘shish, narx, status, rasm",
      icon: Package,
    },
    {
      href: "/platform/shopping/categories",
      title: "Kategoriyalar",
      desc: "Do‘kon bo‘limlari va tartib",
      icon: Tags,
    },
    {
      href: "/platform/shopping/discounts",
      title: "Chegirmalar",
      desc: "Foiz / summa, promo kod, mahsulot bog‘lash",
      icon: Percent,
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Shopping</h1>
            <p className="mt-1 text-stone-500">
              Platforma onlayn do‘koni — mahsulotlar, narxlar va chegirmalar shu yerda
              boshqariladi.
            </p>
          </div>
        </div>
        <Link
          href="/shop"
          target="_blank"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Xaridor oynasi
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100 transition hover:ring-violet-200"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              {c.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-stone-900">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100 transition hover:bg-violet-50/50"
            >
              <Icon className="h-5 w-5 text-violet-600" />
              <h2 className="mt-3 font-bold text-stone-900">{l.title}</h2>
              <p className="mt-1 text-sm text-stone-500">{l.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

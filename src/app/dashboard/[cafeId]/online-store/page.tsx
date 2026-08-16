import Link from "next/link";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function OnlineStorePage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: { id: true, name: true },
  });
  if (!cafe) notFound();

  let products: Array<{
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
    featured: boolean;
    stock: number;
    imageUrl: string | null;
    category: { name: string } | null;
  }> = [];
  try {
    products = await prisma.shopProduct.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
      take: 24,
      select: {
        id: true,
        name: true,
        price: true,
        compareAtPrice: true,
        featured: true,
        stock: true,
        imageUrl: true,
        category: { select: { name: true } },
      },
    });
  } catch {
    products = [];
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="rounded-2xl bg-[var(--dp-accent)]/15 p-3 text-[var(--dp-accent)]">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--dp-accent)]">
              Boshqaruv
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--dp-text)]">
              Onlayn do&apos;kon
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--dp-muted)]">
              Platforma katalogi preview. Xaridorlar{" "}
              <span className="font-medium text-[var(--dp-text)]">/shop</span>{" "}
              sahifasida «Sotib olish» orqali buyurtma qiladi.
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
      </header>

      <section className="dp-card rounded-2xl p-6">
        <h2 className="font-semibold text-[var(--dp-text)]">Platforma katalogi</h2>
        <p className="mt-1 text-sm text-[var(--dp-muted)]">
          Faol mahsulotlar. To&apos;liq boshqaruv — super admin Shopping.
        </p>
        {products.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--dp-muted)]">
            Hali faol mahsulot yo&apos;q. Super admin Shopping → Mahsulotlar
            orqali qo&apos;shadi.
          </p>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex flex-col rounded-xl border border-[var(--dp-border)] p-4"
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="mb-3 h-28 w-full rounded-lg object-cover"
                  />
                ) : null}
                <p className="font-medium text-[var(--dp-text)]">{p.name}</p>
                <p className="mt-1 text-sm text-[var(--dp-accent)]">
                  {formatPrice(p.price)}
                  {p.compareAtPrice != null && p.compareAtPrice > p.price && (
                    <span className="ml-2 text-[var(--dp-muted)] line-through">
                      {formatPrice(p.compareAtPrice)}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-[var(--dp-muted)]">
                  {p.category?.name ?? "Kategoriyasiz"}
                  {p.featured ? " · tavsiya" : ""}
                  {p.stock <= 0 ? " · tugagan" : ""}
                </p>
                <Link
                  href="/shop"
                  target="_blank"
                  className="mt-3 inline-flex justify-center rounded-lg bg-emerald-600/90 px-3 py-2 text-xs font-bold text-white"
                >
                  Sotib olish
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

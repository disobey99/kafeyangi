import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatPrice, ORDER_STATUS_LABELS, orderCreatorLabel } from "@/lib/utils";

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;

  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) notFound();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: { cafeId, createdAt: { gte: todayStart } },
    orderBy: { createdAt: "desc" },
    include: {
      table: true,
      createdBy: { select: { name: true } },
      items: { include: { product: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--dp-text)]">Bugungi buyurtmalar</h1>
      <p className="mt-1 text-[var(--dp-muted)]">{orders.length} ta buyurtma</p>

      <div className="mt-8 space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-xl border border-[var(--dp-border)] bg-[var(--dp-card)] p-5 shadow-[var(--dp-shadow)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-[var(--dp-accent)]">
                #{String(order.orderNumber).padStart(3, "0")}
              </span>
              <span className="text-sm text-[var(--dp-muted)]">
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>
            {order.table && (
              <p className="text-sm text-[var(--dp-muted)]">Stol {order.table.number}</p>
            )}
            <p className="text-xs text-[var(--dp-muted)]">{orderCreatorLabel(order)}</p>
            <ul className="mt-2 text-sm text-[var(--dp-subtle)]">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.quantity}x {item.product.name}
                </li>
              ))}
            </ul>
            <p className="mt-2 font-semibold text-[var(--dp-text)]">
              {formatPrice(order.totalAmount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

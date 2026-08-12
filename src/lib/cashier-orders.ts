/** Kassada stol buyurtmalarini bitta kartada ko'rsatish */

type TableOrderLike = {
  id: string;
  orderNumber: number;
  table: { number: number } | null;
  items: unknown[];
  totalAmount: number;
  createdAt: string;
};

export function groupOrdersByTable<T extends TableOrderLike>(orders: T[]): T[] {
  const standalone: T[] = [];
  const byTable = new Map<number, T[]>();

  for (const order of orders) {
    if (!order.table) {
      standalone.push(order);
      continue;
    }
    const num = order.table.number;
    const list = byTable.get(num) ?? [];
    list.push(order);
    byTable.set(num, list);
  }

  const grouped: T[] = [...standalone];

  for (const tableOrders of byTable.values()) {
    tableOrders.sort((a, b) => a.orderNumber - b.orderNumber);
    const primary = tableOrders[0];
    if (tableOrders.length === 1) {
      grouped.push(primary);
      continue;
    }

    grouped.push({
      ...primary,
      items: tableOrders.flatMap((o) => o.items),
      totalAmount: tableOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    } as T);
  }

  return grouped.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function orderHasNewItems(
  items: { isNewAddition?: boolean }[],
): boolean {
  return items.some((i) => i.isNewAddition);
}

export function orderNeedsCashierAction(order: {
  status: string;
  items: { isNewAddition?: boolean }[];
}): boolean {
  return order.status === "PENDING" || orderHasNewItems(order.items);
}

import { prisma } from "@/lib/prisma";

export type PrepStationRow = {
  id: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
};

/** Kafeda kamida bitta default stansiya bo'lishini ta'minlaydi */
export async function ensureDefaultPrepStation(cafeId: string): Promise<PrepStationRow> {
  const existing = await prisma.prepStation.findFirst({
    where: { cafeId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
  });
  if (existing) {
    if (!existing.isDefault) {
      await prisma.prepStation.update({
        where: { id: existing.id },
        data: { isDefault: true },
      });
      return { ...existing, isDefault: true };
    }
    return existing;
  }

  return prisma.prepStation.create({
    data: {
      cafeId,
      name: "Oshxona",
      sortOrder: 0,
      isDefault: true,
      isActive: true,
    },
  });
}

export async function listPrepStations(cafeId: string, activeOnly = true) {
  await ensureDefaultPrepStation(cafeId);
  return prisma.prepStation.findMany({
    where: { cafeId, ...(activeOnly ? { isActive: true } : {}) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getDefaultPrepStation(cafeId: string) {
  const stations = await listPrepStations(cafeId, true);
  return stations.find((s) => s.isDefault) ?? stations[0]!;
}

type ProductForStation = {
  id: string;
  prepStationId: string | null;
  category?: { defaultPrepStationId: string | null } | null;
};

/** Mahsulot → stansiya (mahsulot > kategoriya > default) */
export async function resolvePrepStationForProduct(
  cafeId: string,
  product: ProductForStation,
): Promise<{ id: string; name: string }> {
  const defaultStation = await getDefaultPrepStation(cafeId);

  const candidateId =
    product.prepStationId ?? product.category?.defaultPrepStationId ?? null;

  if (candidateId) {
    const station = await prisma.prepStation.findFirst({
      where: { id: candidateId, cafeId, isActive: true },
      select: { id: true, name: true },
    });
    if (station) return station;
  }

  return { id: defaultStation.id, name: defaultStation.name };
}

export async function resolvePrepStationsForProducts(
  cafeId: string,
  productIds: string[],
): Promise<Map<string, { id: string; name: string }>> {
  const uniqueIds = [...new Set(productIds)];
  const products = await prisma.product.findMany({
    where: { id: { in: uniqueIds }, cafeId },
    select: {
      id: true,
      prepStationId: true,
      category: { select: { defaultPrepStationId: true } },
    },
  });

  const defaultStation = await getDefaultPrepStation(cafeId);
  const stationIds = [
    ...new Set(
      products
        .map((p) => p.prepStationId ?? p.category.defaultPrepStationId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const stations = stationIds.length
    ? await prisma.prepStation.findMany({
        where: { id: { in: stationIds }, cafeId, isActive: true },
        select: { id: true, name: true },
      })
    : [];
  const stationMap = new Map(stations.map((s) => [s.id, s]));

  const result = new Map<string, { id: string; name: string }>();
  for (const product of products) {
    const candidateId =
      product.prepStationId ?? product.category.defaultPrepStationId;
    const resolved =
      (candidateId && stationMap.get(candidateId)) ||
      ({ id: defaultStation.id, name: defaultStation.name } as const);
    result.set(product.id, resolved);
  }
  return result;
}

/** Stansiya holatidan buyurtma holatini sinxronlash */
export async function syncOrderStatusFromItems(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { status: true } } },
  });
  if (!order) return null;
  if (order.status === "CANCELLED" || order.status === "DELIVERED") {
    return order;
  }

  const statuses = order.items.map((i) => i.status);
  if (statuses.length === 0) return order;

  let next: typeof order.status = order.status;
  if (statuses.every((s) => s === "READY" || s === "DELIVERED" || s === "CANCELLED")) {
    next = "READY";
  } else if (statuses.some((s) => s === "PREPARING" || s === "READY")) {
    next = "PREPARING";
  } else if (statuses.some((s) => s === "CONFIRMED")) {
    next = "CONFIRMED";
  }

  if (next === order.status) return order;

  return prisma.order.update({
    where: { id: orderId },
    data: { status: next },
  });
}

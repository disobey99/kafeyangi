import { prisma } from "@/lib/prisma";
import { publishCafeEvent } from "@/lib/realtime";
import { TABLE_ZONE_LABELS, type TableZone } from "@/lib/table-zones";

const OPEN_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "READY"] as const;

export async function getNextTableNumber(cafeId: string) {
  const max = await prisma.table.aggregate({
    where: { cafeId },
    _max: { number: true },
  });
  return (max._max.number ?? 0) + 1;
}

function layoutForZone(zoneTablesInZone: number) {
  const col = zoneTablesInZone % 6;
  const row = Math.floor(zoneTablesInZone / 6);
  return { posX: col * 110 + 16, posY: row * 100 + 16 };
}

export async function createCafeTable(
  cafeId: string,
  opts: { zone?: TableZone; seats?: number; name?: string },
) {
  const zone = opts.zone ?? "HALL";
  const seats = opts.seats ?? 4;

  const zoneCount = await prisma.table.count({
    where: { cafeId, isActive: true, zone },
  });
  const number = await getNextTableNumber(cafeId);
  const { posX, posY } = layoutForZone(zoneCount);
  const defaultName =
    zone === "HALL"
      ? `Stol ${number}`
      : `${TABLE_ZONE_LABELS[zone] ?? zone} ${zoneCount + 1}`;

  const table = await prisma.table.create({
    data: {
      cafeId,
      number,
      name: opts.name?.trim() || defaultName,
      zone,
      seats,
      posX,
      posY,
    },
  });

  publishCafeEvent(cafeId, { type: "table.updated" });
  return table;
}

export async function syncCafeTableCount(
  cafeId: string,
  targetCount: number,
  defaultSeats = 4,
  defaultZone: TableZone = "HALL",
) {
  const existing = await prisma.table.findMany({
    where: { cafeId },
    orderBy: { number: "asc" },
  });

  const zoneTables = existing.filter((t) => t.zone === defaultZone);
  const activeZoneTables = zoneTables.filter((t) => t.isActive);

  if (activeZoneTables.length > targetCount) {
    const toDeactivate = [...activeZoneTables]
      .sort((a, b) => b.number - a.number)
      .slice(0, activeZoneTables.length - targetCount);

    for (const table of toDeactivate) {
      const openOrders = await prisma.order.count({
        where: {
          tableId: table.id,
          status: { in: [...OPEN_STATUSES] },
        },
      });
      if (openOrders > 0) {
        throw new Error(
          `${table.name ?? `Stol ${table.number}`} da ochiq buyurtma bor. Avval to'lovni yakunlang.`,
        );
      }
      await prisma.table.update({
        where: { id: table.id },
        data: { isActive: false, status: "FREE" },
      });
    }
  }

  const inactiveZoneTables = zoneTables.filter((t) => !t.isActive);
  let activeAfterDeactivate =
    activeZoneTables.length > targetCount ? targetCount : activeZoneTables.length;

  for (const table of inactiveZoneTables) {
    if (activeAfterDeactivate >= targetCount) break;
    await prisma.table.update({
      where: { id: table.id },
      data: { isActive: true },
    });
    activeAfterDeactivate++;
  }

  while (activeAfterDeactivate < targetCount) {
    const zoneCount = await prisma.table.count({
      where: { cafeId, isActive: true, zone: defaultZone },
    });
    const number = await getNextTableNumber(cafeId);
    const { posX, posY } = layoutForZone(zoneCount);
    const name =
      defaultZone === "HALL"
        ? `Stol ${number}`
        : `${TABLE_ZONE_LABELS[defaultZone]} ${zoneCount + 1}`;

    await prisma.table.create({
      data: {
        cafeId,
        number,
        name,
        seats: defaultSeats,
        zone: defaultZone,
        posX,
        posY,
      },
    });
    activeAfterDeactivate++;
  }

  publishCafeEvent(cafeId, { type: "table.updated" });

  return prisma.table.findMany({
    where: { cafeId, isActive: true },
    orderBy: { number: "asc" },
  });
}

export async function getActiveCafeTables(cafeId: string) {
  return prisma.table.findMany({
    where: { cafeId, isActive: true },
    orderBy: { number: "asc" },
  });
}

import { prisma } from "@/lib/prisma";

export async function verifyTableGuest(tableId: string, qrToken: string) {
  const table = await prisma.table.findFirst({
    where: { id: tableId, qrToken, isActive: true },
    include: { cafe: { select: { id: true, status: true } } },
  });

  if (!table) return { ok: false as const, error: "Stol topilmadi" };
  if (table.cafe.status === "SUSPENDED" || table.cafe.status === "CANCELLED") {
    return { ok: false as const, error: "Kafe vaqtincha yopiq" };
  }

  return { ok: true as const, table };
}

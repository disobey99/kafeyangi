import { prisma } from "@/lib/prisma";
import { verifyTableGuest } from "@/lib/table-guest";
import { OPEN_ORDER_STATUSES } from "@/lib/order-mutate";

/** Mijoz sahifasi ochiq bo'lsa, shu oralig'da heartbeat yuboriladi */
export const GUEST_VISIT_IDLE_MS = 30 * 60 * 1000;

export type GuestVisitResult =
  | {
      ok: true;
      visitId: string;
      visitToken: string;
      orderingAllowed: boolean;
      sessionClosed: boolean;
      tableBusy: boolean;
      idleTimeoutMs: number;
    }
  | { ok: false; error: string };

export async function endGuestVisitsForTable(tableId: string) {
  await prisma.tableGuestVisit.updateMany({
    where: { tableId, endedAt: null },
    data: { endedAt: new Date() },
  });
}

async function countOpenTableOrders(tableId: string) {
  return prisma.order.count({
    where: {
      tableId,
      status: { in: [...OPEN_ORDER_STATUSES] },
    },
  });
}

async function reactivateVisitIfOwnOrders(
  tableId: string,
  visitToken: string,
): Promise<{ visitId: string; visitToken: string } | null> {
  const visit = await prisma.tableGuestVisit.findFirst({
    where: { tableId, visitToken },
  });
  if (!visit) return null;

  const ownOpenOrders = await prisma.order.count({
    where: {
      tableId,
      guestVisitId: visit.id,
      status: { in: [...OPEN_ORDER_STATUSES] },
    },
  });
  if (ownOpenOrders === 0) return null;

  const now = new Date();
  await prisma.tableGuestVisit.update({
    where: { id: visit.id },
    data: { endedAt: null, lastSeenAt: now },
  });
  return { visitId: visit.id, visitToken: visit.visitToken };
}

export async function resolveTableGuestVisit(
  tableId: string,
  qrToken: string,
  visitToken?: string | null,
): Promise<GuestVisitResult> {
  const guest = await verifyTableGuest(tableId, qrToken);
  if (!guest.ok) return { ok: false, error: guest.error };

  const table = guest.table;
  const base = { idleTimeoutMs: GUEST_VISIT_IDLE_MS };

  if (table.status === "BILL_REQUESTED") {
    await endGuestVisitsForTable(tableId);
    return {
      ok: true,
      visitId: "",
      visitToken: visitToken ?? "",
      orderingAllowed: false,
      sessionClosed: true,
      tableBusy: false,
      ...base,
    };
  }

  if (visitToken) {
    const activeVisit = await prisma.tableGuestVisit.findFirst({
      where: { tableId, visitToken, endedAt: null },
    });
    if (activeVisit) {
      await prisma.tableGuestVisit.update({
        where: { id: activeVisit.id },
        data: { lastSeenAt: new Date() },
      });
      return {
        ok: true,
        visitId: activeVisit.id,
        visitToken: activeVisit.visitToken,
        orderingAllowed: true,
        sessionClosed: false,
        tableBusy: false,
        ...base,
      };
    }

    const reactivated = await reactivateVisitIfOwnOrders(tableId, visitToken);
    if (reactivated) {
      return {
        ok: true,
        visitId: reactivated.visitId,
        visitToken: reactivated.visitToken,
        orderingAllowed: true,
        sessionClosed: false,
        tableBusy: false,
        ...base,
      };
    }
  }

  const openCount = await countOpenTableOrders(tableId);

  // Stol bo'sh — ochiq buyurtma yo'q (status OCCUPIED qolgan bo'lsa ham)
  if (openCount === 0) {
    if (table.status !== "FREE") {
      await prisma.table.update({
        where: { id: tableId },
        data: { status: "FREE", assignedWaiterId: null },
      });
    }
    await endGuestVisitsForTable(tableId);
    const visit = await prisma.tableGuestVisit.create({
      data: { tableId },
    });
    return {
      ok: true,
      visitId: visit.id,
      visitToken: visit.visitToken,
      orderingAllowed: true,
      sessionClosed: false,
      tableBusy: false,
      ...base,
    };
  }

  // Ochiq buyurtmalar bor — faqat shu sessiyadagi mijoz davom etadi
  return {
    ok: true,
    visitId: "",
    visitToken: "",
    orderingAllowed: false,
    sessionClosed: false,
    tableBusy: true,
    ...base,
  };
}

export async function requireActiveGuestVisit(
  tableId: string,
  qrToken: string,
  visitToken: string,
) {
  const resolved = await resolveTableGuestVisit(tableId, qrToken, visitToken);
  if (!resolved.ok) return { error: resolved.error };
  if (resolved.sessionClosed) {
    return { error: "Hisob so'ralgan — yangi buyurtma berib bo'lmaydi" as const };
  }
  if (resolved.tableBusy) {
    return { error: "Stol band — boshqa mijoz buyurtma bergan" as const };
  }
  if (!resolved.orderingAllowed || !resolved.visitId) {
    return { error: "Buyurtma berib bo'lmaydi" as const };
  }
  return { ok: true as const, visitId: resolved.visitId };
}

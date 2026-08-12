import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCafeStaff } from "@/lib/cafe-access";
import { TABLE_STATUS_COLORS, TABLE_STATUS_LABELS } from "@/lib/reports";
import { OPEN_ORDER_STATUSES } from "@/lib/order-mutate";
import {
  floorDisplayLabel,
  floorGuestLabel,
  resolveFloorDisplayStatus,
  resolveSessionOccupiedSince,
} from "@/lib/floor-display";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  const [cafe, tables] = await Promise.all([
    prisma.cafe.findUnique({
      where: { id: cafeId },
      select: { name: true },
    }),
    prisma.table.findMany({
      where: { cafeId, isActive: true },
      orderBy: { number: "asc" },
      include: {
        assignedWaiter: { select: { id: true, name: true } },
        orders: {
          where: {
            status: { in: [...OPEN_ORDER_STATUSES] },
          },
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            customerName: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
  ]);

  return NextResponse.json({
    cafeName: cafe?.name ?? "",
    tables: tables.map((t) => {
      const openOrders = t.orders;
      const openTotal = openOrders.reduce((s, o) => s + o.totalAmount, 0);
      const displayStatus = resolveFloorDisplayStatus(t.status, openOrders);
      const guestLabel = floorGuestLabel(t.assignedWaiter, openOrders);
      const occupiedSince = resolveSessionOccupiedSince(
        displayStatus,
        openOrders,
        OPEN_ORDER_STATUSES,
      );
      return {
        id: t.id,
        number: t.number,
        name: t.name,
        status: t.status,
        displayStatus,
        displayLabel: floorDisplayLabel(displayStatus),
        posX: t.posX,
        posY: t.posY,
        zone: t.zone,
        seats: t.seats,
        statusLabel: TABLE_STATUS_LABELS[t.status],
        statusColor: TABLE_STATUS_COLORS[t.status],
        assignedWaiter: t.assignedWaiter
          ? { id: t.assignedWaiter.id, name: t.assignedWaiter.name }
          : null,
        guestLabel,
        occupiedSince,
        openOrderCount: openOrders.length,
        openTotal,
        orders: openOrders,
        activeOrder: openOrders[openOrders.length - 1] ?? null,
      };
    }),
  });
}

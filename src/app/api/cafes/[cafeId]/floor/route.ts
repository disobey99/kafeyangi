import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { publishCafeEvent } from "@/lib/realtime";
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
  { params }: { params: Promise<{ cafeId: string }> }
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const [cafe, tables] = await Promise.all([
    prisma.cafe.findUnique({ where: { id: cafeId }, select: { name: true } }),
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
        guestLabel: floorGuestLabel(t.assignedWaiter, openOrders),
        occupiedSince,
        openOrderCount: openOrders.length,
        openTotal,
        activeOrder: openOrders[openOrders.length - 1] ?? null,
        statusLabel: TABLE_STATUS_LABELS[t.status],
        statusColor: TABLE_STATUS_COLORS[t.status],
        assignedWaiter: t.assignedWaiter
          ? { id: t.assignedWaiter.id, name: t.assignedWaiter.name }
          : null,
      };
    }),
  });
}

const layoutSchema = z.object({
  tables: z.array(
    z.object({
      id: z.string(),
      posX: z.number().int().min(0).max(5000),
      posY: z.number().int().min(0).max(5000),
      seats: z.number().int().min(1).max(99).optional(),
      zone: z.enum(["HALL", "BOOTH", "OUTDOOR"]).optional(),
    }),
  ),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;

    const { tables } = layoutSchema.parse(await request.json());

    await prisma.$transaction(
      tables.map((t) =>
        prisma.table.updateMany({
          where: { id: t.id, cafeId },
          data: {
            posX: t.posX,
            posY: t.posY,
            ...(t.seats != null ? { seats: t.seats } : {}),
            ...(t.zone != null ? { zone: t.zone } : {}),
          },
        }),
      ),
    );

    publishCafeEvent(cafeId, { type: "table.updated" });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

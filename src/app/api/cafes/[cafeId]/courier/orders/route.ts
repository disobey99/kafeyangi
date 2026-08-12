import { NextResponse } from "next/server";
import { CafeRole } from "@prisma/client";
import { requireCafeStaff } from "@/lib/cafe-access";
import { estimateEtaMinutes, formatDistanceKm, haversineKm } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_LABELS } from "@/lib/utils";

const UPCOMING_STATUSES = ["CONFIRMED", "PREPARING"] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeStaff(cafeId, [
    CafeRole.COURIER,
    CafeRole.OWNER,
    CafeRole.MANAGER,
  ]);
  if (!access.ok) return access.response;

  const userId = access.session.userId;

  const member = await prisma.cafeMember.findUnique({
    where: { cafeId_userId: { cafeId, userId } },
    select: { onDuty: true, role: true },
  });
  const onDuty = Boolean(member?.onDuty);

  const [orders, courierLoc, cafe] = await Promise.all([
    prisma.order.findMany({
      where: {
        cafeId,
        type: "DELIVERY",
        OR: onDuty
          ? [
              { status: { in: [...UPCOMING_STATUSES] } },
              {
                status: "READY",
                OR: [{ assignedCourierId: null }, { assignedCourierId: userId }],
              },
              {
                assignedCourierId: userId,
                status: { in: ["READY", "PREPARING", "CONFIRMED"] },
              },
            ]
          : [
              // Ishda emas — faqat o'zida qolgan yo'ldagi buyurtmalar
              {
                assignedCourierId: userId,
                status: { in: ["READY", "PREPARING", "CONFIRMED"] },
              },
            ],
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        source: true,
        customerName: true,
        customerPhone: true,
        customerAddress: true,
        customerLat: true,
        customerLng: true,
        notes: true,
        totalAmount: true,
        paymentMethod: true,
        paidAt: true,
        assignedCourierId: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            quantity: true,
            product: { select: { name: true } },
          },
        },
      },
    }),
    prisma.courierLocation.findUnique({
      where: { cafeId_userId: { cafeId, userId } },
    }),
    prisma.cafe.findUnique({
      where: { id: cafeId },
      select: { latitude: true, longitude: true, name: true },
    }),
  ]);

  const fromLat = courierLoc?.latitude ?? null;
  const fromLng = courierLoc?.longitude ?? null;
  const locationFresh =
    courierLoc &&
    Date.now() - new Date(courierLoc.updatedAt).getTime() < 5 * 60 * 1000;

  return NextResponse.json({
    onDuty,
    cafe: {
      latitude: cafe?.latitude ?? null,
      longitude: cafe?.longitude ?? null,
    },
    courierLocation: courierLoc
      ? {
          latitude: courierLoc.latitude,
          longitude: courierLoc.longitude,
          updatedAt: courierLoc.updatedAt,
          fresh: Boolean(locationFresh),
        }
      : null,
    orders: orders.map((o) => {
      const upcoming =
        onDuty && (UPCOMING_STATUSES as readonly string[]).includes(o.status);
      const available =
        onDuty && o.status === "READY" && !o.assignedCourierId;
      const mine = o.assignedCourierId === userId && o.status !== "DELIVERED";

      let distanceKm: number | null = null;
      let distanceLabel: string | null = null;
      let etaMinutes: number | null = null;
      let distanceTarget: "customer" | "cafe" | null = null;

      const destLat =
        o.customerLat != null && o.customerLng != null
          ? o.customerLat
          : cafe?.latitude ?? null;
      const destLng =
        o.customerLat != null && o.customerLng != null
          ? o.customerLng
          : cafe?.longitude ?? null;

      if (
        fromLat != null &&
        fromLng != null &&
        destLat != null &&
        destLng != null
      ) {
        distanceKm = haversineKm(fromLat, fromLng, destLat, destLng);
        distanceLabel = formatDistanceKm(distanceKm);
        etaMinutes = estimateEtaMinutes(distanceKm);
        distanceTarget =
          o.customerLat != null && o.customerLng != null ? "customer" : "cafe";
      }

      return {
        ...o,
        statusLabel: ORDER_STATUS_LABELS[o.status] ?? o.status,
        upcoming,
        available,
        mine,
        distanceKm,
        distanceLabel,
        etaMinutes,
        distanceTarget,
      };
    }),
  });
}

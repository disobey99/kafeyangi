import { NextResponse } from "next/server";
import { requireCafeManager } from "@/lib/cafe-access";
import { geocodeAddress, isInUzbekistan } from "@/lib/geocode";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_LABELS } from "@/lib/utils";

const ACTIVE_STATUSES = ["CONFIRMED", "PREPARING", "READY"] as const;
const FRESH_MS = 5 * 60 * 1000;

function parseEtaMinutes(notes: string | null): number | null {
  if (!notes) return null;
  const match = notes.match(/\[ETA:\s*(\d+)\]/);
  return match ? parseInt(match[1], 10) : null;
}

async function ensureDeliveryCoords<
  T extends {
    id: string;
    customerAddress: string | null;
    customerLat: number | null;
    customerLng: number | null;
  },
>(
  order: T,
  near?: { lat: number | null; lng: number | null },
): Promise<T> {
  const address = order.customerAddress?.trim();
  const coordsOk =
    order.customerLat != null &&
    order.customerLng != null &&
    isInUzbekistan(order.customerLat, order.customerLng);

  // To‘g‘ri UZ koordinata bor — qayta qidirish shart emas
  if (coordsOk) return order;
  if (!address) return order;

  try {
    const geo = await geocodeAddress(address, {
      nearLat: near?.lat,
      nearLng: near?.lng,
      preferUz: true,
    });
    if (!geo) return order;
    await prisma.order.update({
      where: { id: order.id },
      data: {
        customerLat: geo.latitude,
        customerLng: geo.longitude,
      },
    });
    return {
      ...order,
      customerLat: geo.latitude,
      customerLng: geo.longitude,
    };
  } catch {
    return order;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const [cafe, members, locations, deliveriesRaw] = await Promise.all([
    prisma.cafe.findUnique({
      where: { id: cafeId },
      select: { name: true, latitude: true, longitude: true },
    }),
    prisma.cafeMember.findMany({
      where: { cafeId, role: "COURIER", isActive: true },
      select: {
        userId: true,
        onDuty: true,
        user: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.courierLocation.findMany({
      where: { cafeId },
    }),
    prisma.order.findMany({
      where: {
        cafeId,
        type: "DELIVERY",
        status: { in: [...ACTIVE_STATUSES] },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        customerName: true,
        customerPhone: true,
        customerAddress: true,
        customerLat: true,
        customerLng: true,
        notes: true,
        totalAmount: true,
        assignedCourierId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  if (!cafe) {
    return NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 });
  }

  const cafeNear = {
    lat: cafe.latitude,
    lng: cafe.longitude,
  };

  // Koordinatasiz yoki xorijiy (UZ tashqarida) nuqtalarni qayta aniqlash
  const needGeo = [...deliveriesRaw]
    .filter((o) => {
      if (!o.customerAddress?.trim()) return false;
      if (o.customerLat == null || o.customerLng == null) return true;
      return !isInUzbekistan(o.customerLat, o.customerLng);
    })
    .sort((a, b) => {
      const aA = a.assignedCourierId ? 0 : 1;
      const bA = b.assignedCourierId ? 0 : 1;
      return aA - bA;
    })
    .slice(0, 3);

  const geoMap = new Map<string, { lat: number; lng: number }>();
  for (let i = 0; i < needGeo.length; i++) {
    const o = needGeo[i];
    const fixed = await ensureDeliveryCoords(o, cafeNear);
    if (
      fixed.customerLat != null &&
      fixed.customerLng != null &&
      isInUzbekistan(fixed.customerLat, fixed.customerLng)
    ) {
      geoMap.set(o.id, { lat: fixed.customerLat, lng: fixed.customerLng });
    }
    if (i < needGeo.length - 1) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  const deliveries = deliveriesRaw.map((o) => {
    const g = geoMap.get(o.id);
    return g
      ? { ...o, customerLat: g.lat, customerLng: g.lng }
      : o;
  });

  const locByUser = new Map(locations.map((l) => [l.userId, l]));
  const now = Date.now();

  const activeDeliveries = deliveries.map((o) => ({
    orderId: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    statusLabel: ORDER_STATUS_LABELS[o.status] ?? o.status,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerAddress: o.customerAddress,
    customerLat: o.customerLat,
    customerLng: o.customerLng,
    assignedCourierId: o.assignedCourierId,
    etaMinutes: parseEtaMinutes(o.notes),
    totalAmount: o.totalAmount,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    destinationLabel:
      o.customerAddress?.trim() ||
      (o.customerLat != null && o.customerLng != null
        ? `${o.customerLat.toFixed(5)}, ${o.customerLng.toFixed(5)}`
        : null),
  }));

  const couriers = members.map((m) => {
    const loc = locByUser.get(m.userId);
    const locationFresh = Boolean(
      loc && now - new Date(loc.updatedAt).getTime() < FRESH_MS,
    );
    const mine = activeDeliveries.filter((d) => d.assignedCourierId === m.userId);
    const primary = mine[0] ?? null;

    return {
      userId: m.userId,
      name: m.user.name,
      phone: m.user.phone,
      onDuty: Boolean(m.onDuty),
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      updatedAt: loc?.updatedAt ?? null,
      locationFresh,
      activeOrderIds: mine.map((d) => d.orderId),
      headingTo: primary
        ? {
            orderId: primary.orderId,
            orderNumber: primary.orderNumber,
            address: primary.destinationLabel,
            customerLat: primary.customerLat,
            customerLng: primary.customerLng,
            statusLabel: primary.statusLabel,
            etaMinutes: primary.etaMinutes,
          }
        : null,
    };
  });

  return NextResponse.json({
    cafe: {
      name: cafe.name,
      latitude: cafe.latitude,
      longitude: cafe.longitude,
    },
    couriers,
    activeDeliveries,
    fetchedAt: new Date().toISOString(),
  });
}

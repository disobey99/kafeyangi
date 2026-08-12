import { NextResponse } from "next/server";
import { CafeRole } from "@prisma/client";
import { requireCafeStaff } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_LABELS, formatPrice } from "@/lib/utils";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

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
  const since = startOfToday();

  const url = new URL(_request.url);
  const dateParam = url.searchParams.get("date"); // format: YYYY-MM-DD

  const deliveredToday = await prisma.order.findMany({
    where: {
      cafeId,
      type: "DELIVERY",
      status: "DELIVERED",
      assignedCourierId: userId,
      updatedAt: { gte: since },
    },
    select: {
      id: true,
      totalAmount: true,
      review: { select: { score: true } },
    },
  });

  let historyWhere: any = {
    cafeId,
    type: "DELIVERY",
    status: "DELIVERED",
    assignedCourierId: userId,
  };

  if (dateParam) {
    const start = new Date(dateParam);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateParam);
    end.setHours(23, 59, 59, 999);
    historyWhere.updatedAt = {
      gte: start,
      lte: end,
    };
  } else {
    historyWhere.updatedAt = {
      gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    };
  }

  const history = await prisma.order.findMany({
    where: historyWhere,
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      customerName: true,
      customerPhone: true,
      customerAddress: true,
      totalAmount: true,
      paymentMethod: true,
      paidAt: true,
      updatedAt: true,
      review: { select: { score: true, comment: true } },
      items: {
        select: {
          quantity: true,
          product: { select: { name: true } },
        },
      },
    },
  });

  const orderCount = deliveredToday.length;
  const revenueTiyin = deliveredToday.reduce((s, o) => s + o.totalAmount, 0);
  const scores = deliveredToday
    .map((o) => o.review?.score)
    .filter((s): s is number => typeof s === "number");
  const avgRating =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

  return NextResponse.json({
    today: {
      orderCount,
      revenueTiyin,
      revenueLabel: formatPrice(revenueTiyin),
      avgRating,
      ratingCount: scores.length,
    },
    history: history.map((o) => ({
      ...o,
      statusLabel: ORDER_STATUS_LABELS[o.status] ?? o.status,
    })),
  });
}

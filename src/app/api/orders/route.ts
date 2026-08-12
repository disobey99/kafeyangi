import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OrderSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishCafeEvent } from "@/lib/realtime";
import { getSession } from "@/lib/auth";
import { getCafeMembership, requireCafeStaff } from "@/lib/cafe-access";
import { requireStaffPinUnlocked } from "@/lib/staff-pin";
import {
  checkStockAvailable,
  consumeRawMaterialsForOrder,
  decrementStockForOrder,
} from "@/lib/inventory";
import {
  addItemsToOrder,
  findPrimaryOpenTableOrder,
  findPrimaryOpenTableOrderForVisit,
} from "@/lib/order-mutate";
import { resolveOrderItemModifiers } from "@/lib/modifiers";
import { resolvePrepStationsForProducts } from "@/lib/prep-stations";
import { createPaymeCheckoutForOrder } from "@/lib/payme";
import {
  applyLoyaltyEarn,
  applyLoyaltyRedeem,
  getLoyaltyBalance,
  LOYALTY_REDEEM_DISCOUNT_TIYIN,
  normalizePhone,
} from "@/lib/loyalty";
import { computeOrderTotals } from "@/lib/waiter-service-fee";
import { requireActiveGuestVisit } from "@/lib/table-guest-visit";
import { isCafeCustomerAccessBlocked } from "@/lib/cafe-public-access";
import { shouldAutoSendToKitchen } from "@/lib/order-kitchen-routing";
import { enqueueKitchenPrintJobs } from "@/lib/kitchen-print-jobs";

const orderSchema = z.object({
  cafeId: z.string(),
  tableId: z.string().optional(),
  type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]).optional(),
  source: z.enum(["QR_TABLE", "ONLINE", "WAITER", "CASHIER"]).optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerLat: z.number().min(-90).max(90).optional(),
  customerLng: z.number().min(-180).max(180).optional(),
  notes: z.string().optional(),
  useLoyaltyPoints: z.boolean().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1),
        modifierOptionIds: z.array(z.string()).optional(),
      })
    )
    .min(1),
  payWithPayme: z.boolean().optional(),
  serviceMode: z.enum(["WAITER", "SELF"]).optional(),
  qrToken: z.string().optional(),
  guestVisitToken: z.string().optional(),
});

async function resolveOrderSource(
  cafeId: string,
  tableId: string | undefined,
  requestedSource?: OrderSource
): Promise<OrderSource> {
  if (requestedSource === "WAITER" || requestedSource === "CASHIER") {
    const session = await getSession();
    if (session) {
      const membership = await getCafeMembership(session.userId, cafeId);
      if (membership) return requestedSource;
    }
  }

  return tableId ? OrderSource.QR_TABLE : OrderSource.ONLINE;
}

async function resolveCreatedById(cafeId: string): Promise<string | undefined> {
  const session = await getSession();
  if (!session) return undefined;

  const membership = await getCafeMembership(session.userId, cafeId);
  if (!membership) return undefined;

  return session.userId;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = orderSchema.parse(body);

    if (data.type === "DELIVERY" && !data.customerAddress?.trim()) {
      return NextResponse.json(
        { error: "Yetkazish manzili kerak" },
        { status: 400 }
      );
    }

    const staffCounterOrder =
      data.source === "CASHIER" || data.source === "WAITER";

    if (
      (data.type === "DELIVERY" ||
        (data.type === "TAKEAWAY" && !staffCounterOrder)) &&
      !data.customerPhone?.trim()
    ) {
      return NextResponse.json(
        { error: "Telefon raqam kerak" },
        { status: 400 }
      );
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: data.items.map((i) => i.productId) },
        cafeId: data.cafeId,
        isAvailable: true,
      },
    });

    if (products.length !== data.items.length) {
      return NextResponse.json(
        { error: "Ba'zi mahsulotlar mavjud emas" },
        { status: 400 }
      );
    }

    const productMap = new Map(
      products.map((p) => [
        p.id,
        {
          trackStock: p.trackStock,
          stockQty: p.stockQty,
          name: p.name,
          price: p.price,
          discountPrice: p.discountPrice,
        },
      ]),
    );

    const stockErr = checkStockAvailable(data.items, productMap);
    if (stockErr) {
      return NextResponse.json({ error: stockErr }, { status: 400 });
    }

    const cafe = await prisma.cafe.findUnique({ where: { id: data.cafeId } });
    if (!cafe) {
      return NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 });
    }

    const orderType = data.type ?? (data.tableId ? "DINE_IN" : "TAKEAWAY");

    if (orderType === "DELIVERY" && !cafe.deliveryEnabled) {
      return NextResponse.json({ error: "Yetkazish vaqtincha o'chirilgan" }, { status: 400 });
    }

    const orderSource = await resolveOrderSource(data.cafeId, data.tableId, data.source);

    if (
      isCafeCustomerAccessBlocked(cafe.status) &&
      (orderSource === OrderSource.ONLINE || orderSource === OrderSource.QR_TABLE)
    ) {
      return NextResponse.json(
        {
          error:
            cafe.status === "SUSPENDED"
              ? "Kafe vaqtincha yopiq — buyurtma qabul qilinmaydi"
              : "Kafe faol emas — buyurtma qabul qilinmaydi",
        },
        { status: 403 },
      );
    }

    let guestVisitId: string | undefined;
    const isQrTableOrder =
      Boolean(data.tableId) &&
      orderType === "DINE_IN" &&
      orderSource === OrderSource.QR_TABLE;

    if (isQrTableOrder) {
      if (!data.qrToken?.trim() || !data.guestVisitToken?.trim()) {
        return NextResponse.json(
          { error: "Stoldagi QR-kodni qayta skanerlang" },
          { status: 403 },
        );
      }
      const visitCheck = await requireActiveGuestVisit(
        data.tableId!,
        data.qrToken,
        data.guestVisitToken,
      );
      if ("error" in visitCheck) {
        return NextResponse.json({ error: visitCheck.error }, { status: 403 });
      }
      guestVisitId = visitCheck.visitId;
    }

    if (orderSource === OrderSource.WAITER || orderSource === OrderSource.CASHIER) {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: "Kirish kerak" }, { status: 401 });
      }
      const pinCheck = await requireStaffPinUnlocked(data.cafeId, session.userId);
      if (!pinCheck.ok) {
        return NextResponse.json(
          {
            error:
              pinCheck.reason === "setup_required"
                ? "Avval xavfsizlik parolini o'rnating"
                : "Ekran qulflangan — parol kiriting",
          },
          { status: 403 },
        );
      }
    }

    // Stol buyurtmasi: ochiq buyurtma bo'lsa avval qo'shamiz (yangi raqam ochilmaydi)
    if (data.tableId && orderType === "DINE_IN") {
      const existing = guestVisitId
        ? await findPrimaryOpenTableOrderForVisit(data.tableId, guestVisitId)
        : await findPrimaryOpenTableOrder(data.tableId);
      if (existing) {
        const result = await addItemsToOrder(existing.id, data.items, {
          sendToKitchen: shouldAutoSendToKitchen(existing.source) || shouldAutoSendToKitchen(orderSource),
          markAsNew: !shouldAutoSendToKitchen(existing.source) && !shouldAutoSendToKitchen(orderSource),
        });
        if ("error" in result) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        if (data.notes?.trim()) {
          const mergedNotes = [existing.notes, data.notes.trim()]
            .filter(Boolean)
            .join(" · ");
          await prisma.order.update({
            where: { id: existing.id },
            data: { notes: mergedNotes },
          });
        }

        await prisma.table.update({
          where: { id: data.tableId },
          data: { status: "OCCUPIED" },
        });
        publishCafeEvent(data.cafeId, { type: "table.updated" });

        decrementStockForOrder(data.items).catch(() => {});
        consumeRawMaterialsForOrder(data.cafeId, data.items, null).catch(() => {});

        const updated = result.order!;
        return NextResponse.json({
          id: updated.id,
          orderNumber: updated.orderNumber,
          subtotalAmount: updated.subtotalAmount,
          discountAmount: updated.discountAmount,
          serviceFeeAmount: updated.serviceFeeAmount,
          totalAmount: updated.totalAmount,
          appended: true,
        });
      }
    }

    let subtotalAmount = 0;
    const autoKitchen = shouldAutoSendToKitchen(orderSource);
    const orderItems: {
      productId: string;
      quantity: number;
      unitPrice: number;
      modifierSummary: string | null;
      prepStationId: string | null;
      prepStationName: string | null;
      status: "PENDING" | "CONFIRMED";
    }[] = [];

    const stationByProduct = await resolvePrepStationsForProducts(
      data.cafeId,
      data.items.map((i) => i.productId),
    );

    // Mijoz ilovasi / QR: taom chegirma narxi (discountPrice); ofitsiant/kassa: asosiy narx
    const useAppDiscountPrice =
      orderSource === OrderSource.ONLINE || orderSource === OrderSource.QR_TABLE;

    for (const item of data.items) {
      const product = productMap.get(item.productId)!;
      const { unitExtra, summary } = await resolveOrderItemModifiers(
        item.productId,
        item.modifierOptionIds,
      );
      const basePrice =
        useAppDiscountPrice && product.discountPrice != null && product.discountPrice > 0
          ? product.discountPrice
          : product.price;
      const unitPrice = basePrice + unitExtra;
      subtotalAmount += unitPrice * item.quantity;
      const station = stationByProduct.get(item.productId);
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        modifierSummary: summary,
        prepStationId: station?.id ?? null,
        prepStationName: station?.name ?? null,
        status: autoKitchen ? "CONFIRMED" : "PENDING",
      });
    }

    if (
      (orderType === "DELIVERY" || orderType === "TAKEAWAY") &&
      cafe.minOrderAmount > 0 &&
      subtotalAmount < cafe.minOrderAmount
    ) {
      return NextResponse.json(
        {
          error: `Minimal buyurtma: ${Math.floor(cafe.minOrderAmount / 100).toLocaleString("uz-UZ")} so'm`,
        },
        { status: 400 },
      );
    }

    if (orderType === "DELIVERY" && cafe.deliveryFee > 0) {
      subtotalAmount += cafe.deliveryFee;
    }

    // Banner/aksiya bloklari (Promotion) faqat ko'rinish — narxga ta'sir qilmaydi.
    // Narx chegirmasi faqat taomning discountPrice orqali (yuqorida) va loyalty.
    let discountAmount = 0;

    if (data.useLoyaltyPoints && data.customerPhone) {
      const balance = await getLoyaltyBalance(data.cafeId, data.customerPhone);
      if (balance.canRedeem) {
        discountAmount += LOYALTY_REDEEM_DISCOUNT_TIYIN;
      }
    }

    let hasWaiter = orderSource === "WAITER" || orderSource === "CASHIER";
    let tableAssignedWaiterId: string | undefined;
    if (data.tableId && orderSource !== OrderSource.QR_TABLE) {
      const table = await prisma.table.findUnique({
        where: { id: data.tableId },
        select: { assignedWaiterId: true },
      });
      if (table?.assignedWaiterId) {
        hasWaiter = true;
        tableAssignedWaiterId = table.assignedWaiterId;
      }
    }

    const { serviceFeeAmount, totalAmount } = computeOrderTotals({
      subtotalAmount,
      discountAmount,
      hasWaiter,
      waiterServiceFeePercent: cafe.waiterServiceFeePercent,
    });

    const sessionCreatedById = await resolveCreatedById(data.cafeId);
    const createdById =
      sessionCreatedById ||
      (orderSource !== OrderSource.QR_TABLE ? tableAssignedWaiterId : undefined) ||
      null;

    const serviceMode =
      orderSource === OrderSource.QR_TABLE
        ? data.serviceMode === "SELF"
          ? "SELF"
          : "WAITER"
        : "WAITER";

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const lastOrder = await prisma.order.findFirst({
      where: { cafeId: data.cafeId, createdAt: { gte: todayStart } },
      orderBy: { orderNumber: "desc" },
    });

    const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

    const order = await prisma.order.create({
      data: {
        cafeId: data.cafeId,
        tableId: data.tableId,
        orderNumber,
        type: orderType,
        source: orderSource,
        serviceMode,
        status: autoKitchen ? "CONFIRMED" : "PENDING",
        createdById,
        guestVisitId: guestVisitId ?? null,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        customerLat: data.customerLat ?? null,
        customerLng: data.customerLng ?? null,
        notes: data.notes,
        subtotalAmount,
        discountAmount,
        serviceFeeAmount,
        totalAmount,
        items: { create: orderItems },
      },
      include: { items: { include: { product: true } }, table: true },
    });

    if (data.tableId) {
      await prisma.table.update({
        where: { id: data.tableId },
        data: { status: "OCCUPIED" },
      });
      publishCafeEvent(data.cafeId, { type: "table.updated" });
    }

    publishCafeEvent(data.cafeId, {
      type: "order.created",
      payload: { orderId: order.id, orderNumber: order.orderNumber },
    });

    const { sendNewOrderPush } = await import("@/lib/push-server");
    sendNewOrderPush(data.cafeId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.table?.number,
    }).catch(() => {});

    // Buyurtmalar Telegram bot chatiga yuborilmaydi — mijozlar Mini App orqali buyurtma beradi

    if (data.useLoyaltyPoints && data.customerPhone) {
      applyLoyaltyRedeem(
        data.cafeId,
        normalizePhone(data.customerPhone),
        order.id,
      ).catch(() => {});
    }

    decrementStockForOrder(data.items).catch(() => {});
    consumeRawMaterialsForOrder(data.cafeId, data.items, createdById).catch(() => {});

    if (autoKitchen) {
      await enqueueKitchenPrintJobs(order.id).catch((e) =>
        console.error("enqueueKitchenPrintJobs:", e),
      );
    }

    let paymeCheckoutUrl: string | undefined;
    if (data.payWithPayme && cafe.paymeEnabled) {
      const { getConfiguredAppUrl } = await import("@/lib/app-url");
      const base = getConfiguredAppUrl();
      const payme = await createPaymeCheckoutForOrder(
        order.id,
        `${base}/c/${cafe.slug}/app?paid=${order.id}`,
      );
      if ("url" in payme) paymeCheckoutUrl = payme.url;
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      subtotalAmount: order.subtotalAmount,
      discountAmount: order.discountAmount,
      serviceFeeAmount: order.serviceFeeAmount,
      totalAmount: order.totalAmount,
      paymeCheckoutUrl,
      items: order.items.map((i) => ({
        quantity: i.quantity,
        name: i.product.name,
        prepStationId: i.prepStationId,
        prepStationName: i.prepStationName,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
    }
    console.error("POST /api/orders:", error);
    const message =
      error instanceof Error ? error.message : "Server xatosi";
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "Server xatosi" },
      { status: 500 },
    );
  }
}

/** Kassa / oshxona / TV / notifier uchun yupqa ro'yxat — to'liq Product olinmaydi */
const STAFF_ORDERS_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  type: true,
  source: true,
  totalAmount: true,
  notes: true,
  customerName: true,
  customerPhone: true,
  customerAddress: true,
  createdAt: true,
  table: { select: { number: true } },
  createdBy: { select: { id: true, name: true } },
  items: {
    select: {
      id: true,
      quantity: true,
      status: true,
      isNewAddition: true,
      prepStationId: true,
      prepStationName: true,
      modifierSummary: true,
      product: { select: { name: true } },
    },
  },
} as const;

export async function GET(request: NextRequest) {
  const cafeId = request.nextUrl.searchParams.get("cafeId");
  if (!cafeId) {
    return NextResponse.json({ error: "cafeId kerak" }, { status: 400 });
  }

  const access = await requireCafeStaff(cafeId);
  if (!access.ok) return access.response;

  const orders = await prisma.order.findMany({
    where: {
      cafeId,
      status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
    },
    orderBy: { createdAt: "desc" },
    select: STAFF_ORDERS_SELECT,
    take: 50,
  });

  return NextResponse.json({ orders });
}

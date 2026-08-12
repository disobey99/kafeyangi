import webpush from "web-push";
import { CafeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

let vapidReady = false;

function ensureVapid() {
  if (vapidReady) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@kafe.uz";

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
  return true;
}

export function isPushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

async function sendToSubscriptions(
  subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: string,
) {
  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }),
  );
}

export async function sendWaiterCallPush(
  cafeId: string,
  tableNumber: number,
  callId: string,
) {
  if (!ensureVapid()) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { cafeId },
  });

  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({
    type: "waiter_call",
    tableNumber,
    callId,
    cafeId,
    title: "Ofitsiant chaqirildi!",
    body: `Stol ${tableNumber} — tezroq boring`,
    url: `/staff/${cafeId}`,
  });

  await sendToSubscriptions(subscriptions, payload);
}

/** Kassir / oshxona / ofitsiant — yangi buyurtma push (PWA) */
export async function sendNewOrderPush(
  cafeId: string,
  opts: { orderId: string; orderNumber: number; tableNumber?: number },
) {
  if (!ensureVapid()) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { cafeId },
  });
  if (subscriptions.length === 0) return;

  const num = String(opts.orderNumber).padStart(3, "0");
  const tablePart =
    opts.tableNumber != null ? ` · Stol ${opts.tableNumber}` : "";
  const payload = JSON.stringify({
    type: "new_order",
    cafeId,
    orderId: opts.orderId,
    orderNumber: opts.orderNumber,
    tableNumber: opts.tableNumber,
    title: "Yangi buyurtma",
    body: `#${num}${tablePart}`,
    url: `/cashier/${cafeId}`,
  });

  await sendToSubscriptions(subscriptions, payload);
}

/** Yetkazuvchilarga yetkazish buyurtmasi haqida push */
export async function sendCourierDeliveryPush(
  cafeId: string,
  opts: {
    orderId: string;
    orderNumber: number;
    status: string;
  },
) {
  if (!ensureVapid()) return;

  const couriers = await prisma.cafeMember.findMany({
    where: { cafeId, role: CafeRole.COURIER, isActive: true, onDuty: true },
    select: { userId: true },
  });
  if (couriers.length === 0) return;

  const userIds = couriers.map((c) => c.userId);
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { cafeId, userId: { in: userIds } },
  });
  if (subscriptions.length === 0) return;

  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: { slug: true },
  });

  const isReady = opts.status === "READY";
  const payload = JSON.stringify({
    type: "courier_delivery",
    cafeId,
    orderId: opts.orderId,
    orderNumber: opts.orderNumber,
    status: opts.status,
    title: isReady ? "Yetkazish tayyor!" : "Yangi yetkazish",
    body: isReady
      ? `#${String(opts.orderNumber).padStart(3, "0")} — olib ketishingiz mumkin`
      : `#${String(opts.orderNumber).padStart(3, "0")} — oshxonada tayyorlanmoqda`,
    url: cafe?.slug ? `/c/${cafe.slug}/app?mode=courier` : "/",
  });

  await sendToSubscriptions(subscriptions, payload);
}

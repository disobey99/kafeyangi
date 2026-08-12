import { NextRequest, NextResponse } from "next/server";
import { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { payInvoice } from "@/lib/billing";
import { BILLING_PERIOD_DAYS } from "@/lib/billing-constants";
import {
  verifyPaddleWebhookSignature,
  type PaddleWebhookEvent,
} from "@/lib/paddle";

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function activateCafeFromPaddle(input: {
  cafeId: string;
  invoiceId?: string;
  plan?: string;
  period?: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  transactionId?: string;
}) {
  const cafe = await prisma.cafe.findUnique({ where: { id: input.cafeId } });
  if (!cafe) return;

  if (input.invoiceId) {
    const result = await payInvoice(input.invoiceId);
    if ("ok" in result) {
      await prisma.billingInvoice.updateMany({
        where: { id: input.invoiceId },
        data: {
          method: "PADDLE",
          paddleTransactionId: input.transactionId,
          paddleSubscriptionId: input.subscriptionId ?? undefined,
        },
      });
    }
  } else {
    const now = new Date();
    const days = input.period === "yearly" ? 365 + 60 : BILLING_PERIOD_DAYS;
    // Yangi Paddle to'lov — bugundan + davr
    const newEnd = addDays(now, days);
    await prisma.cafe.update({
      where: { id: input.cafeId },
      data: {
        status: "ACTIVE",
        subscriptionEndsAt: newEnd,
        suspendReason: null,
        ...(input.plan && ["STARTER", "STANDARD", "PRO"].includes(input.plan)
          ? { plan: input.plan as SubscriptionPlan }
          : {}),
      },
    });
  }

  await prisma.cafe.update({
    where: { id: input.cafeId },
    data: {
      ...(input.customerId ? { paddleCustomerId: input.customerId } : {}),
      ...(input.subscriptionId
        ? { paddleSubscriptionId: input.subscriptionId }
        : {}),
    },
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature");

  if (!verifyPaddleWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Imzo noto'g'ri" }, { status: 401 });
  }

  let event: PaddleWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaddleWebhookEvent;
  } catch {
    return NextResponse.json({ error: "JSON xato" }, { status: 400 });
  }

  const custom = event.data.custom_data ?? {};
  const cafeId = custom.cafeId;
  const invoiceId = custom.invoiceId;
  const plan = custom.plan;
  const period = custom.period;

  const paidEvents = new Set([
    "transaction.completed",
    "transaction.paid",
    "subscription.activated",
    "subscription.created",
  ]);

  if (paidEvents.has(event.event_type) && cafeId) {
    await activateCafeFromPaddle({
      cafeId,
      invoiceId,
      plan,
      period,
      customerId: event.data.customer_id,
      subscriptionId: event.data.subscription_id ?? event.data.id,
      transactionId: event.data.id,
    });
  }

  if (
    (event.event_type === "subscription.canceled" ||
      event.event_type === "subscription.past_due") &&
    cafeId
  ) {
    // Grace: billing cron still handles suspend; just clear link on cancel
    if (event.event_type === "subscription.canceled") {
      await prisma.cafe.updateMany({
        where: { id: cafeId },
        data: { paddleSubscriptionId: null },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

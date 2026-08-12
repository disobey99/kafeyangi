import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SubscriptionPlan } from "@prisma/client";
import { requireCafeManager } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";
import {
  createPaddleCheckoutTransaction,
  getPaddlePriceId,
  isPaddleConfigured,
} from "@/lib/paddle";
import type { BillingPeriod } from "@/lib/plans";
import { createInvoiceForCafe } from "@/lib/billing";

const bodySchema = z.object({
  plan: z.enum(["STARTER", "STANDARD", "PRO"]).optional(),
  period: z.enum(["monthly", "yearly"]).default("monthly"),
  invoiceId: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  if (!isPaddleConfigured()) {
    return NextResponse.json(
      { error: "Paddle sozlanmagan. Admin .env ga PADDLE_* kalitlarini qo'ying." },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }

  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: { owner: { select: { email: true } } },
  });
  if (!cafe) {
    return NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 });
  }

  let invoiceId = parsed.data.invoiceId;
  let plan = (parsed.data.plan ?? cafe.plan) as SubscriptionPlan;
  const period = parsed.data.period as BillingPeriod;

  if (invoiceId) {
    const invoice = await prisma.billingInvoice.findFirst({
      where: { id: invoiceId, cafeId, status: { in: ["PENDING", "OVERDUE"] } },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Hisob-faktura topilmadi" }, { status: 404 });
    }
    plan = invoice.plan;
  } else if (parsed.data.plan && parsed.data.plan !== cafe.plan) {
    // Tarif o'zgartirish / yangi obuna — invoice yaratamiz
    await prisma.cafe.update({
      where: { id: cafeId },
      data: { plan: parsed.data.plan },
    });
    plan = parsed.data.plan;
    const inv = await createInvoiceForCafe(cafeId, { allowTrial: true });
    invoiceId = inv?.id;
  } else {
    const inv = await createInvoiceForCafe(cafeId, { allowTrial: true });
    invoiceId = inv?.id;
  }

  const priceId = getPaddlePriceId(plan, period);
  if (!priceId) {
    return NextResponse.json(
      { error: `${plan} (${period}) uchun Paddle Price ID topilmadi` },
      { status: 400 },
    );
  }

  try {
    const tx = await createPaddleCheckoutTransaction({
      priceId,
      cafeId,
      invoiceId,
      plan,
      period,
      customerEmail: cafe.owner.email,
      paddleCustomerId: cafe.paddleCustomerId,
    });

    if (invoiceId) {
      await prisma.billingInvoice.update({
        where: { id: invoiceId },
        data: {
          paddleTransactionId: tx.id,
          method: "PADDLE",
        },
      });
    }

    return NextResponse.json({
      transactionId: tx.id,
      clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
      env: process.env.PADDLE_ENV === "production" ? "production" : "sandbox",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Paddle xatosi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

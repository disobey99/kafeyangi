import { createHmac, timingSafeEqual } from "crypto";
import type { SubscriptionPlan } from "@prisma/client";
import type { BillingPeriod } from "@/lib/plans";

const PADDLE_API_BASE = {
  sandbox: "https://sandbox-api.paddle.com",
  production: "https://api.paddle.com",
} as const;

export type PaddleEnv = keyof typeof PADDLE_API_BASE;

export function getPaddleEnv(): PaddleEnv {
  return process.env.PADDLE_ENV === "production" ? "production" : "sandbox";
}

export function isPaddleConfigured(): boolean {
  return Boolean(
    process.env.PADDLE_API_KEY &&
      process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN &&
      (process.env.PADDLE_PRICE_STARTER_MONTHLY ||
        process.env.PADDLE_PRICE_STANDARD_MONTHLY ||
        process.env.PADDLE_PRICE_PRO_MONTHLY),
  );
}

export function getPaddlePriceId(
  plan: SubscriptionPlan,
  period: BillingPeriod = "monthly",
): string | null {
  const key =
    period === "yearly"
      ? `PADDLE_PRICE_${plan}_YEARLY`
      : `PADDLE_PRICE_${plan}_MONTHLY`;
  const monthlyFallback = process.env[`PADDLE_PRICE_${plan}_MONTHLY`];
  return process.env[key] || monthlyFallback || null;
}

export async function paddleFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("PADDLE_API_KEY sozlanmagan");

  const res = await fetch(`${PADDLE_API_BASE[getPaddleEnv()]}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const json = (await res.json()) as { data?: T; error?: { detail?: string } };
  if (!res.ok) {
    throw new Error(json.error?.detail || `Paddle xatosi (${res.status})`);
  }
  return json.data as T;
}

export type PaddleTransaction = {
  id: string;
  status: string;
  customer_id?: string | null;
  subscription_id?: string | null;
  custom_data?: Record<string, string> | null;
};

export async function createPaddleCheckoutTransaction(input: {
  priceId: string;
  cafeId: string;
  invoiceId?: string;
  plan: SubscriptionPlan;
  period: BillingPeriod;
  customerEmail?: string;
  paddleCustomerId?: string | null;
}): Promise<PaddleTransaction> {
  const body: Record<string, unknown> = {
    items: [{ price_id: input.priceId, quantity: 1 }],
    custom_data: {
      cafeId: input.cafeId,
      plan: input.plan,
      period: input.period,
      ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
    },
  };

  if (input.paddleCustomerId) {
    body.customer_id = input.paddleCustomerId;
  } else if (input.customerEmail) {
    body.customer = { email: input.customerEmail };
  }

  return paddleFetch<PaddleTransaction>("/transactions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Paddle Billing webhook imzo tekshiruvi (ts + h1) */
export function verifyPaddleWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  ) as { ts?: string; h1?: string };

  if (!parts.ts || !parts.h1) return false;

  const signedPayload = `${parts.ts}:${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(parts.h1, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type PaddleWebhookEvent = {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: {
    id: string;
    status?: string;
    customer_id?: string | null;
    subscription_id?: string | null;
    custom_data?: Record<string, string> | null;
    items?: { price?: { id?: string } }[];
  };
};

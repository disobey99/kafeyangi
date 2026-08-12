import { prisma } from "@/lib/prisma";

export type PaymeCheckoutParams = {
  merchantId: string;
  amountTiyin: number;
  orderId: string;
  returnUrl: string;
};

export function buildPaymeCheckoutUrl(params: PaymeCheckoutParams): string {
  const payload = {
    m: params.merchantId,
    ac: { order_id: params.orderId },
    a: params.amountTiyin,
    c: params.returnUrl,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `https://checkout.paycom.uz/${encoded}`;
}

export function paymeAuthHeader(merchantId: string, key: string): string {
  const token = Buffer.from(`${merchantId}:${key}`).toString("base64");
  return `Basic ${token}`;
}

type PaymeRpcRequest = {
  method: string;
  params: Record<string, unknown>;
  id: number;
};

type PaymeRpcResponse = {
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
  id: number;
};

export async function handlePaymeMerchantRequest(
  body: PaymeRpcRequest,
  merchantId: string,
  key: string,
): Promise<PaymeRpcResponse> {
  const { method, params, id } = body;

  if (method === "CheckPerformTransaction") {
    const amount = params.amount as number;
    const orderId = (params.account as { order_id?: string })?.order_id;
    if (!orderId) {
      return { error: { code: -31050, message: "Buyurtma topilmadi" }, id };
    }
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { cafe: true } });
    if (!order || !order.cafe.paymeEnabled) {
      return { error: { code: -31050, message: "Buyurtma topilmadi" }, id };
    }
    if (order.totalAmount !== amount) {
      return { error: { code: -31001, message: "Noto'g'ri summa" }, id };
    }
    if (order.paidAt) {
      return { error: { code: -31050, message: "Allaqachon to'langan" }, id };
    }
    return { result: { allow: true }, id };
  }

  if (method === "CreateTransaction") {
    const amount = params.amount as number;
    const orderId = (params.account as { order_id?: string })?.order_id;
    const txnId = String(params.id ?? Date.now());
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.totalAmount !== amount) {
      return { error: { code: -31050, message: "Buyurtma topilmadi" }, id };
    }
    await prisma.order.update({
      where: { id: orderId },
      data: { paymeTransactionId: txnId },
    });
    return {
      result: {
        create_time: Date.now(),
        transaction: txnId,
        state: 1,
      },
      id,
    };
  }

  if (method === "PerformTransaction") {
    const txnId = String(params.id);
    const order = await prisma.order.findFirst({ where: { paymeTransactionId: txnId } });
    if (!order) {
      return { error: { code: -31003, message: "Tranzaksiya topilmadi" }, id };
    }
    if (!order.paidAt) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paidAt: new Date(),
          paymentMethod: "PAYME",
          status: order.status === "PENDING" ? "CONFIRMED" : order.status,
        },
      });
    }
    return {
      result: {
        transaction: txnId,
        perform_time: Date.now(),
        state: 2,
      },
      id,
    };
  }

  if (method === "CancelTransaction") {
    const txnId = String(params.id);
    await prisma.order.updateMany({
      where: { paymeTransactionId: txnId },
      data: { paymeTransactionId: null },
    });
    return {
      result: {
        transaction: txnId,
        cancel_time: Date.now(),
        state: -1,
      },
      id,
    };
  }

  if (method === "CheckTransaction") {
    const txnId = String(params.id);
    const order = await prisma.order.findFirst({ where: { paymeTransactionId: txnId } });
    if (!order) {
      return { error: { code: -31003, message: "Tranzaksiya topilmadi" }, id };
    }
    return {
      result: {
        create_time: order.createdAt.getTime(),
        perform_time: order.paidAt?.getTime() ?? 0,
        cancel_time: 0,
        transaction: txnId,
        state: order.paidAt ? 2 : 1,
        reason: null,
      },
      id,
    };
  }

  return { error: { code: -32601, message: "Method not found" }, id };
}

export function verifyPaymeAuthorization(
  authHeader: string | null,
  merchantId: string,
  key: string,
): boolean {
  if (!authHeader?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
  return decoded === `${merchantId}:${key}`;
}

export async function createPaymeCheckoutForOrder(orderId: string, returnUrl: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { cafe: true },
  });
  if (!order?.cafe.paymeEnabled || !order.cafe.paymeMerchantId || !order.cafe.paymeKey) {
    return { error: "Payme sozlanmagan" as const };
  }
  const url = buildPaymeCheckoutUrl({
    merchantId: order.cafe.paymeMerchantId,
    amountTiyin: order.totalAmount,
    orderId: order.id,
    returnUrl,
  });
  return { url };
}

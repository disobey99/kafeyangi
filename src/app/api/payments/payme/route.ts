import { NextRequest, NextResponse } from "next/server";
import {
  handlePaymeMerchantRequest,
  verifyPaymeAuthorization,
} from "@/lib/payme";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = request.headers.get("authorization");

    const cafes = await prisma.cafe.findMany({
      where: { paymeEnabled: true, paymeMerchantId: { not: null }, paymeKey: { not: null } },
      select: { paymeMerchantId: true, paymeKey: true },
    });

    const cafe = cafes.find(
      (c) =>
        c.paymeMerchantId &&
        c.paymeKey &&
        verifyPaymeAuthorization(auth, c.paymeMerchantId, c.paymeKey),
    );

    if (!cafe?.paymeMerchantId || !cafe.paymeKey) {
      return NextResponse.json(
        { error: { code: -32504, message: "Avtorizatsiya xato" } },
        { status: 401 },
      );
    }

    const response = await handlePaymeMerchantRequest(
      body,
      cafe.paymeMerchantId,
      cafe.paymeKey,
    );
    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: { code: -32603, message: "Ichki xato" } },
      { status: 500 },
    );
  }
}

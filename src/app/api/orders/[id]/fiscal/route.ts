import { NextRequest, NextResponse } from "next/server";
import { issueFiscalReceipt } from "@/lib/ofd";
import { requireCafeManager } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      cafeId: true,
      fiscalReceiptNo: true,
      fiscalQrData: true,
      fiscalIssuedAt: true,
      totalAmount: true,
      paidAt: true,
      cafe: { select: { ofdCompanyName: true, ofdTin: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  return NextResponse.json({
    fiscalReceiptNo: order.fiscalReceiptNo,
    fiscalQrData: order.fiscalQrData,
    fiscalIssuedAt: order.fiscalIssuedAt,
    companyName: order.cafe.ofdCompanyName,
    tin: order.cafe.ofdTin,
    totalAmount: order.totalAmount,
    paid: !!order.paidAt,
  });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const access = await requireCafeManager(order.cafeId);
  if (!access.ok) return access.response;

  const result = await issueFiscalReceipt(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}

import { NextRequest, NextResponse } from "next/server";
import {
  cancelInvoice,
  getCafeInvoices,
  payInvoice,
  reconcilePendingInvoiceAmounts,
  BILLING_STATUS_LABELS,
} from "@/lib/billing";
import { requireCafeManager } from "@/lib/cafe-access";
import { isPaddleConfigured } from "@/lib/paddle";
import { getPlanCurrency } from "@/lib/plan-pricing";
import { formatPlanCents } from "@/lib/plans";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  await reconcilePendingInvoiceAmounts(cafeId);
  const invoices = await getCafeInvoices(cafeId);
  const currency = getPlanCurrency();

  return NextResponse.json({
    paddleEnabled: isPaddleConfigured(),
    invoices: invoices.map((inv) => ({
      id: inv.id,
      plan: inv.plan,
      amount: inv.amount,
      amountLabel: formatPlanCents(inv.amount, currency),
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      status: inv.status,
      statusLabel: BILLING_STATUS_LABELS[inv.status],
      paidAt: inv.paidAt,
      createdAt: inv.createdAt,
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const body = await request.json();
  const invoiceId = body.invoiceId as string;
  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId kerak" }, { status: 400 });
  }

  if (body.action === "cancel") {
    const result = await cancelInvoice(invoiceId, cafeId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  const invoice = await getCafeInvoices(cafeId).then((list) =>
    list.find((i) => i.id === invoiceId)
  );
  if (!invoice) {
    return NextResponse.json({ error: "Hisob-faktura topilmadi" }, { status: 404 });
  }

  const result = await payInvoice(invoiceId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}

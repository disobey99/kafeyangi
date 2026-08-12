import { PaymentMethod } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  closeTableBill,
  getOpenTables,
  getTableBill,
} from "@/lib/table-bill";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  const { cafeId } = await params;

  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) {
    return NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 });
  }

  const numberParam = request.nextUrl.searchParams.get("number");
  if (!numberParam) {
    const tables = await getOpenTables(cafeId);
    return NextResponse.json({ tables });
  }

  const tableNumber = parseInt(numberParam, 10);
  if (Number.isNaN(tableNumber)) {
    return NextResponse.json({ error: "Stol raqami noto'g'ri" }, { status: 400 });
  }

  const bill = await getTableBill(cafeId, tableNumber);
  if (!bill) {
    return NextResponse.json({ error: "Stol topilmadi" }, { status: 404 });
  }

  return NextResponse.json({ bill });
}

const closeSchema = z.object({
  tableNumber: z.number().int().min(1),
  paymentMethod: z.enum(["CASH", "CARD"]),
  useCashback: z.boolean().optional(),
  customerPhone: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> }
) {
  try {
    const { cafeId } = await params;

    const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
    if (!cafe) {
      return NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 });
    }

    const body = closeSchema.parse(await request.json());
    const result = await closeTableBill(
      cafeId,
      body.tableNumber,
      body.paymentMethod as PaymentMethod,
      {
        useCashback: body.useCashback,
        customerPhone: body.customerPhone,
      },
    );

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("table-bill close error:", error);
    const message =
      error instanceof Error ? error.message : "Ma'lumotlar noto'g'ri";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

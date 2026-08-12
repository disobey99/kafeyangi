import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const cafe = await prisma.cafe.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      menuPrimaryColor: true,
      minOrderAmount: true,
      deliveryFee: true,
      deliveryTimeMinutes: true,
      deliveryEnabled: true,
      address: true,
      phone: true,
    },
  });

  if (!cafe) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  return NextResponse.json({
    ...cafe,
    minOrderAmountSom: Math.floor(cafe.minOrderAmount / 100),
    deliveryFeeSom: Math.floor(cafe.deliveryFee / 100),
  });
}

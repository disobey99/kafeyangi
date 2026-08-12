import { NextRequest, NextResponse } from "next/server";
import { getProductPairings } from "@/lib/product-pairings";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId kerak" }, { status: 400 });
  }

  const suggestions = await getProductPairings(cafeId, productId, 2);
  return NextResponse.json({ suggestions });
}

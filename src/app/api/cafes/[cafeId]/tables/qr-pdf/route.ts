import { NextRequest, NextResponse } from "next/server";
import { requireCafeManager } from "@/lib/cafe-access";
import { prisma } from "@/lib/prisma";
import { generateTableQrPdf } from "@/lib/table-qr-pdf";
import { resolveBaseUrlFromRequest } from "@/lib/server-url";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: {
      tables: { where: { isActive: true }, orderBy: { number: "asc" } },
    },
  });

  if (!cafe) {
    return NextResponse.json({ error: "Kafe topilmadi" }, { status: 404 });
  }

  const tableId = request.nextUrl.searchParams.get("tableId");
  const tables = tableId
    ? cafe.tables.filter((t) => t.id === tableId)
    : cafe.tables;

  if (tableId && tables.length === 0) {
    return NextResponse.json({ error: "Stol topilmadi" }, { status: 404 });
  }

  const base = resolveBaseUrlFromRequest(request);

  const pdfBytes = await generateTableQrPdf({
    cafeName: cafe.name,
    tables: tables.map((t) => ({
      number: t.number,
      name: t.name,
      url: `${base}/c/${cafe.slug}/t/${t.qrToken}`,
    })),
  });

  const filename = tableId
    ? `qr-${cafe.slug}-stol-${tables[0].number}.pdf`
    : `qr-${cafe.slug}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  generateQrPngBuffer,
  loadNooklineMarkPng,
} from "@/lib/qr-with-logo";

type TableQrInput = {
  number: number;
  name: string | null;
  url: string;
};

export async function generateTableQrPdf(opts: {
  cafeName: string;
  tables: TableQrInput[];
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const logoBytes = await loadNooklineMarkPng();
  const logoImage = logoBytes ? await pdf.embedPng(logoBytes) : null;

  const pageWidth = 595;
  const pageHeight = 842;
  const cols = 2;
  const rows = 3;
  const perPage = cols * rows;
  const margin = 40;
  const cellW = (pageWidth - margin * 2) / cols;
  const cellH = (pageHeight - margin * 2) / rows;

  for (let i = 0; i < opts.tables.length; i += perPage) {
    const page = pdf.addPage([pageWidth, pageHeight]);
    const chunk = opts.tables.slice(i, i + perPage);

    for (let j = 0; j < chunk.length; j++) {
      const table = chunk[j];
      const col = j % cols;
      const row = Math.floor(j / cols);
      const x = margin + col * cellW;
      const y = pageHeight - margin - (row + 1) * cellH;

      const qrPng = await generateQrPngBuffer(table.url, 400);
      const qrImage = await pdf.embedPng(qrPng);
      const qrSize = 130;
      const qrX = x + (cellW - qrSize) / 2;
      const qrY = y + cellH - qrSize - 50;

      page.drawRectangle({
        x: x + 8,
        y: y + 8,
        width: cellW - 16,
        height: cellH - 16,
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 1,
      });

      page.drawText(opts.cafeName, {
        x: x + 16,
        y: y + cellH - 28,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });

      page.drawText(`Stol ${table.number}`, {
        x: x + 16,
        y: y + cellH - 44,
        size: 14,
        font: fontBold,
      });

      page.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      });

      if (logoImage) {
        const logoSize = qrSize * 0.22;
        const pad = logoSize * 0.2;
        const box = logoSize + pad * 2;
        const boxX = qrX + (qrSize - box) / 2;
        const boxY = qrY + (qrSize - box) / 2;

        page.drawRectangle({
          x: boxX,
          y: boxY,
          width: box,
          height: box,
          color: rgb(1, 1, 1),
          borderWidth: 0,
        });

        page.drawImage(logoImage, {
          x: boxX + pad,
          y: boxY + pad,
          width: logoSize,
          height: logoSize,
        });
      }

      if (table.name) {
        page.drawText(table.name, {
          x: x + 16,
          y: y + 20,
          size: 10,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      page.drawText("Skaner qiling — buyurtma bering", {
        x: x + 16,
        y: y + 8,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  return pdf.save();
}

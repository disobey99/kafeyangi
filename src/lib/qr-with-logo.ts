import { readFile } from "fs/promises";
import path from "path";
import QRCode from "qrcode";

const LOGO_REL = path.join("public", "brand", "nookline-mark.png");

/** Nookline mark PNG (server) */
export async function loadNooklineMarkPng(): Promise<Uint8Array | null> {
  try {
    const buf = await readFile(path.join(process.cwd(), LOGO_REL));
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

/** Logo uchun yuqori error-correction QR */
export async function generateQrPngBuffer(
  data: string,
  size = 400,
): Promise<Buffer> {
  return QRCode.toBuffer(data, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#111111", light: "#ffffff" },
  });
}

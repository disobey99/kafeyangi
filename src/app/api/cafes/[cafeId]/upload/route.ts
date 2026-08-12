import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireCafeStaff } from "@/lib/cafe-access";
import {
  deleteLocalUpload,
  getUploadDir,
  isCafeOwnedUpload,
} from "@/lib/uploads";

/** Avatar / mahsulot / logo — diskni to'ldirmaslik uchun */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeStaff(cafeId);
    if (!access.ok) return access.response;

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_UPLOAD_BYTES + 64 * 1024) {
      return NextResponse.json(
        { error: "Fayl juda katta (maks. 5 MB)" },
        { status: 413 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const replaceUrlRaw = formData.get("replaceUrl");
    const replaceUrl =
      typeof replaceUrlRaw === "string" ? replaceUrlRaw.trim() : "";

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Fayl topilmadi" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Fayl juda katta (maks. 5 MB)" },
        { status: 413 },
      );
    }

    const nameLower = (file.name || "").toLowerCase();
    let mime = (file.type || "").toLowerCase();
    // Ba'zi telefonlar (HEIC→JPEG, WebView) MIME ni bo'sh qoldiradi
    if (!mime || !ALLOWED_MIME[mime]) {
      if (nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg")) mime = "image/jpeg";
      else if (nameLower.endsWith(".png")) mime = "image/png";
      else if (nameLower.endsWith(".webp")) mime = "image/webp";
      else if (nameLower.endsWith(".gif")) mime = "image/gif";
    }
    const ext = ALLOWED_MIME[mime];
    if (!ext) {
      return NextResponse.json(
        { error: "Faqat JPEG, PNG, WebP yoki GIF rasm yuklash mumkin" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Vercel filesystem ephemeral — avatar uchun data URL (DB da saqlanadi)
    if (process.env.VERCEL || process.env.UPLOAD_AS_DATA_URL === "1") {
      if (buffer.length > 1.5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Bulutda rasm maks. 1.5 MB. Kichikroq rasm yuklang." },
          { status: 413 },
        );
      }
      const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
      return NextResponse.json({ url: dataUrl });
    }

    const filename = `${cafeId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const uploadDir = getUploadDir();
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, filename), buffer);
    } catch (diskErr) {
      console.error("Disk upload failed, falling back to data URL:", diskErr);
      if (buffer.length > 1.5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Faylni yuklashda xatolik (disk). Kichikroq rasm yuklang." },
          { status: 500 },
        );
      }
      return NextResponse.json({
        url: `data:${mime};base64,${buffer.toString("base64")}`,
      });
    }

    const newUrl = `/uploads/${filename}`;

    // Yangi rasm → eski lokal fayl o'chadi (1 ta rasm qoida)
    if (replaceUrl && isCafeOwnedUpload(replaceUrl, cafeId) && replaceUrl !== newUrl) {
      await deleteLocalUpload(replaceUrl, cafeId);
    }

    return NextResponse.json({ url: newUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Faylni yuklashda xatolik yuz berdi" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import {
  deleteLocalUpload,
  getUploadDir,
  getUploadFilename,
  isLocalUploadUrl,
} from "@/lib/uploads";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const PREFIX = "platform_";

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function isPlatformOwnedUpload(url: string): boolean {
  const name = getUploadFilename(url);
  return !!name && name.startsWith(PREFIX);
}

export async function POST(request: NextRequest) {
  try {
    const access = await requirePlatformApiPermission("action.shopping.manage");
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
    if (!mime || !ALLOWED_MIME[mime]) {
      if (nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg"))
        mime = "image/jpeg";
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

    const filename = `${PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const uploadDir = getUploadDir();
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, filename), buffer);
    } catch (diskErr) {
      console.error("Platform disk upload failed, data URL fallback:", diskErr);
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

    if (
      replaceUrl &&
      isLocalUploadUrl(replaceUrl) &&
      isPlatformOwnedUpload(replaceUrl) &&
      replaceUrl !== newUrl
    ) {
      await deleteLocalUpload(replaceUrl);
    }

    return NextResponse.json({ url: newUrl });
  } catch (error) {
    console.error("Platform upload error:", error);
    return NextResponse.json(
      { error: "Faylni yuklashda xatolik yuz berdi" },
      { status: 500 },
    );
  }
}

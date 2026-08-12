import "server-only";

import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/** Faqat lokal /uploads/ fayllar — tashqi URL ga tegilmaydi */
export function isLocalUploadUrl(url: string | null | undefined): url is string {
  return (
    typeof url === "string" &&
    url.startsWith("/uploads/") &&
    !url.includes("..") &&
    !url.includes("\\")
  );
}

export function getUploadFilename(url: string): string | null {
  if (!isLocalUploadUrl(url)) return null;
  const name = url.slice("/uploads/".length).split("?")[0] ?? "";
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return null;
  return name;
}

/** Fayl shu kafega tegishli: `{cafeId}_...` */
export function isCafeOwnedUpload(
  url: string | null | undefined,
  cafeId: string,
): boolean {
  const name = url ? getUploadFilename(url) : null;
  if (!name || !cafeId) return false;
  return name.startsWith(`${cafeId}_`);
}

export async function deleteLocalUpload(
  url: string | null | undefined,
  cafeId?: string,
): Promise<boolean> {
  if (!isLocalUploadUrl(url)) return false;
  if (cafeId && !isCafeOwnedUpload(url, cafeId)) return false;

  const name = getUploadFilename(url);
  if (!name) return false;

  const full = path.join(UPLOAD_DIR, name);
  try {
    await fs.unlink(full);
    return true;
  } catch {
    return false;
  }
}

/** Yangi URL saqlanganda eski lokal faylni o‘chirish */
export async function replaceLocalUpload(
  oldUrl: string | null | undefined,
  newUrl: string | null | undefined,
  cafeId?: string,
): Promise<void> {
  if (!oldUrl || oldUrl === newUrl) return;
  await deleteLocalUpload(oldUrl, cafeId);
}

export function getUploadDir(): string {
  return UPLOAD_DIR;
}

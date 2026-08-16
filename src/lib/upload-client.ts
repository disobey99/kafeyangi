async function postImageUpload(
  endpoint: string,
  file: File,
  replaceUrl?: string | null,
): Promise<{ url: string } | { error: string }> {
  const body = new FormData();
  body.append("file", file);
  if (replaceUrl?.startsWith("/uploads/")) {
    body.append("replaceUrl", replaceUrl);
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      body,
    });
    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    if (!res.ok || !data.url) {
      return { error: data.error || "Rasm yuklanmadi" };
    }
    return { url: data.url };
  } catch {
    return { error: "Rasm yuklashda ulanish xatosi" };
  }
}

/** Browser: bitta rasm yuklash + eski lokal faylni almashtirish */
export async function uploadCafeImage(
  cafeId: string,
  file: File,
  replaceUrl?: string | null,
): Promise<{ url: string } | { error: string }> {
  return postImageUpload(`/api/cafes/${cafeId}/upload`, file, replaceUrl);
}

/** Super admin Shopping: mahsulot / kategoriya rasmi */
export async function uploadPlatformImage(
  file: File,
  replaceUrl?: string | null,
): Promise<{ url: string } | { error: string }> {
  return postImageUpload("/api/platform/upload", file, replaceUrl);
}

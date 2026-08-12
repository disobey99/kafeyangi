/** Browser: bitta rasm yuklash + eski lokal faylni almashtirish */
export async function uploadCafeImage(
  cafeId: string,
  file: File,
  replaceUrl?: string | null,
): Promise<{ url: string } | { error: string }> {
  const body = new FormData();
  body.append("file", file);
  if (replaceUrl?.startsWith("/uploads/")) {
    body.append("replaceUrl", replaceUrl);
  }

  try {
    const res = await fetch(`/api/cafes/${cafeId}/upload`, {
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

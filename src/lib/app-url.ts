/** NEXT_PUBLIC_APP_URL — protokolsiz bo‘lsa https/http qo‘shiladi */

export function normalizeAppUrl(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (
    trimmed.startsWith("localhost") ||
    trimmed.startsWith("127.0.0.1") ||
    /^\d+\.\d+\.\d+\.\d+/.test(trimmed)
  ) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

export function getConfiguredAppUrl(): string {
  return normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL);
}

/** Production asosiy domen */
export const PRODUCTION_APP_URL = "https://kafeyangi-avk6.vercel.app";

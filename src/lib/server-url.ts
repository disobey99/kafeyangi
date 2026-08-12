import { headers } from "next/headers";
import type { NextRequest } from "next/server";

function isLocalHostname(host: string) {
  return host === "localhost" || host === "127.0.0.1";
}

/** .env dagi tarmoq (LAN) manzil — telefon QR uchun */
function getNetworkEnvUrl(): string | null {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!envUrl) return null;
  try {
    const host = new URL(envUrl).hostname;
    return isLocalHostname(host) ? null : envUrl;
  } catch {
    return null;
  }
}

/** QR va havolalar uchun — dev rejimida ham telefon ochadigan manzil */
export async function getServerBaseUrl(): Promise<string> {
  const networkEnv = getNetworkEnvUrl();
  if (networkEnv) return networkEnv;

  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "http";

  if (process.env.NODE_ENV === "development" && host) {
    return `${proto}://${host}`;
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;

  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export function resolveBaseUrlFromRequest(request: NextRequest): string {
  const networkEnv = getNetworkEnvUrl();
  if (networkEnv) return networkEnv;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;

  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

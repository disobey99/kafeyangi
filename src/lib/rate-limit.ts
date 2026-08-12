import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const CLEAN_EVERY = 200;
let ops = 0;

function prune(now: number) {
  ops += 1;
  if (ops % CLEAN_EVERY !== 0) return;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export function clientIpFromHeaders(headers: Headers): string {
  const xf = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xf) return xf;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

/**
 * Oddiy in-memory rate limit (bitta Node jarayoni).
 * limit — window ichida ruxsat etilgan urinishlar.
 */
export function checkRateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  prune(now);
  const existing = buckets.get(opts.key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  if (existing.count >= opts.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
}

export function rateLimitResponse(retryAfterSec: number, message?: string) {
  return NextResponse.json(
    {
      error:
        message ||
        `Juda ko'p urinish. ${retryAfterSec} soniyadan keyin qayta urinib ko'ring.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

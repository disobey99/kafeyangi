import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const CHALLENGE_COOKIE = "staff_wa_chal";
const CHALLENGE_TTL_SEC = 5 * 60;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

function challengeCookieName(cafeId: string, userId: string) {
  return `${CHALLENGE_COOKIE}_${cafeId}_${userId}`;
}

export type WebAuthnChallengeKind = "register" | "authenticate";

function isLocalHost(host: string) {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0";
}

function hostnameFromUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

/**
 * Cloudflare tunnel / reverse proxy da Host ba'zan localhost bo'ladi.
 * Brauzer esa trycloudflare.com da — rpID shu hostname bo'lishi shart.
 */
export function resolveWebAuthnRp(request: NextRequest | Request) {
  const originHeader = request.headers.get("origin");
  const refererHost = hostnameFromUrl(request.headers.get("referer"));
  const forwardedHost = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("cf-host") ??
    ""
  )
    .split(",")[0]
    ?.trim()
    .split(":")[0];
  const hostHeader = (request.headers.get("host") ?? "").split(":")[0];
  const protoHeader = request.headers.get("x-forwarded-proto");

  const originHost = hostnameFromUrl(originHeader);
  const urlHost = (() => {
    try {
      return new URL(request.url).hostname;
    } catch {
      return null;
    }
  })();

  let clientHost: string | null = null;
  try {
    clientHost = new URL(request.url).searchParams.get("clientHost");
  } catch {
    clientHost = null;
  }

  const candidates = [
    originHost,
    refererHost,
    clientHost,
    forwardedHost || null,
    urlHost,
    hostHeader || null,
  ].filter((h): h is string => Boolean(h));

  const publicHost = candidates.find((h) => !isLocalHost(h));
  const hostname = publicHost || candidates[0] || "localhost";

  let origin = originHeader ?? "";
  if (!origin) {
    const proto = protoHeader ?? (isLocalHost(hostname) ? "http" : "https");
    origin = `${proto}://${hostname}`;
  } else {
    try {
      const o = new URL(origin);
      if (isLocalHost(o.hostname) && !isLocalHost(hostname)) {
        origin = `https://${hostname}`;
      }
    } catch {
      origin = `https://${hostname}`;
    }
  }

  return { rpID: hostname, origin };
}

export async function setWebAuthnChallenge(
  cafeId: string,
  userId: string,
  challenge: string,
  kind: WebAuthnChallengeKind,
) {
  const token = await new SignJWT({ cafeId, userId, challenge, kind })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CHALLENGE_TTL_SEC}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(challengeCookieName(cafeId, userId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CHALLENGE_TTL_SEC,
  });
}

export async function consumeWebAuthnChallenge(
  cafeId: string,
  userId: string,
  kind: WebAuthnChallengeKind,
): Promise<string | null> {
  const cookieStore = await cookies();
  const name = challengeCookieName(cafeId, userId);
  const token = cookieStore.get(name)?.value;
  cookieStore.delete(name);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      payload.cafeId !== cafeId ||
      payload.userId !== userId ||
      payload.kind !== kind ||
      typeof payload.challenge !== "string"
    ) {
      return null;
    }
    return payload.challenge;
  } catch {
    return null;
  }
}

export function uint8FromUserId(userId: string): Uint8Array {
  const buf = new TextEncoder().encode(userId);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) as any;
}

export function publicKeyToBase64Url(key: Uint8Array): string {
  return Buffer.from(key).toString("base64url");
}

export function publicKeyFromBase64Url(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

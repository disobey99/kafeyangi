import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { GlobalRole } from "@prisma/client";
import { getConfiguredAppUrl } from "@/lib/app-url";
import { countTrustedDevices, isTrustedDevice } from "@/lib/device-login";
import { isDeviceLoginApprovalEnabled } from "@/lib/device-login-config";

const SESSION_COOKIE = "kafe_session";
/** APK/WebView da qayta ochilganda login so‘ralmasin — 30 kun */
const SESSION_DAYS = 30;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

/** HTTP da Secure cookie brauzer tomonidan rad etiladi — URL ga qarab. */
export function sessionCookieSecure(): boolean {
  const appUrl = getConfiguredAppUrl();
  if (appUrl.startsWith("https://")) return true;
  if (appUrl.startsWith("http://")) return false;
  if (process.env.VERCEL) return true;
  return process.env.NODE_ENV === "production";
}

function sessionCookieOptions(token: string) {
  return {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    value: token,
  };
}

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  globalRole: GlobalRole;
  /** Qurilma ID — chiqarib yuborilganda sessiya bekor bo'ladi */
  deviceId?: string;
};

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 32) {
      console.error("AUTH_SECRET missing or too short — session invalid");
      return null;
    }
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      globalRole: payload.globalRole as GlobalRole,
      deviceId: typeof payload.deviceId === "string" ? payload.deviceId : undefined,
    };
  } catch {
    // AUTH_SECRET o'zgargan yoki token muddati o'tgan
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  const opts = sessionCookieOptions(token);
  cookieStore.set(SESSION_COOKIE, opts.value, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    maxAge: opts.maxAge,
  });
}

/** Route Handler da Set-Cookie ishonchliroq bo'lishi uchun */
export function attachSessionCookie(res: NextResponse, token: string) {
  const opts = sessionCookieOptions(token);
  res.cookies.set(SESSION_COOKIE, opts.value, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    maxAge: opts.maxAge,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function clearSessionCookieOnResponse(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Qurilma ishonchi tekshiruvi.
 * !trusted va boshqa ishonchli qurilmalar bor → chiqarilgan.
 * !trusted va ro'yxat bo'sh (DB tozalangan / ephemeral) → sessiya saqlanadi (logout loop yo'q).
 */
async function deviceTrustAllowsSession(session: SessionPayload): Promise<boolean> {
  if (
    !isDeviceLoginApprovalEnabled() ||
    !session.deviceId ||
    session.globalRole === GlobalRole.SUPER_ADMIN ||
    (session.globalRole as string) === "PLATFORM_STAFF"
  ) {
    return true;
  }

  try {
    const trusted = await isTrustedDevice(session.userId, session.deviceId);
    if (trusted) return true;
    const count = await countTrustedDevices(session.userId);
    return count === 0;
  } catch (err) {
    console.error("Device trust check failed:", err);
    return true;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  // Cookie ni bu yerda o'chirmaymiz: Server Component da cookies() yozib bo'lmaydi.
  if (!(await deviceTrustAllowsSession(session))) return null;

  return session;
}

/** Faqat Route Handler / Server Action ichida chaqiring */
export async function getSessionAndClearIfRevoked(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (session) return session;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (payload && !(await deviceTrustAllowsSession(payload))) {
    await clearSessionCookie();
  }
  return null;
}

export function isSuperAdmin(session: SessionPayload) {
  return session.globalRole === GlobalRole.SUPER_ADMIN;
}

export function isPlatformAccess(session: SessionPayload) {
  return (
    session.globalRole === GlobalRole.SUPER_ADMIN ||
    (session.globalRole as string) === "PLATFORM_STAFF"
  );
}

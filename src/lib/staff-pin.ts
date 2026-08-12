import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const PIN_COOKIE_PREFIX = "staff_pin_";
const PIN_UNLOCK_HOURS = 12;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export function isValidPin(pin: string) {
  return pin.length === 6 && [...pin].every((c) => c >= "0" && c <= "9");
}

export async function hashStaffPin(pin: string) {
  return bcrypt.hash(pin, 10);
}

export async function verifyStaffPin(pin: string, hash: string) {
  return bcrypt.compare(pin, hash);
}

function pinCookieName(cafeId: string, userId: string) {
  return `${PIN_COOKIE_PREFIX}${cafeId}_${userId}`;
}

export async function setPinUnlockCookie(cafeId: string, userId: string) {
  const token = await new SignJWT({ cafeId, userId, type: "staff_pin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PIN_UNLOCK_HOURS}h`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(pinCookieName(cafeId, userId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PIN_UNLOCK_HOURS * 60 * 60,
  });
}

export async function clearPinUnlockCookie(cafeId: string, userId: string) {
  const cookieStore = await cookies();
  cookieStore.delete(pinCookieName(cafeId, userId));
}

export async function isPinUnlocked(cafeId: string, userId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(pinCookieName(cafeId, userId))?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (
      payload.type === "staff_pin" &&
      payload.cafeId === cafeId &&
      payload.userId === userId
    );
  } catch {
    return false;
  }
}

export async function requireStaffPinUnlocked(cafeId: string, userId: string) {
  const member = await prisma.cafeMember.findUnique({
    where: { cafeId_userId: { cafeId, userId } },
    select: { pinHash: true, pinResetRequired: true },
  });

  if (!member?.pinHash || member.pinResetRequired) {
    return { ok: false as const, reason: "setup_required" as const };
  }

  const unlocked = await isPinUnlocked(cafeId, userId);
  if (!unlocked) {
    return { ok: false as const, reason: "locked" as const };
  }

  return { ok: true as const };
}

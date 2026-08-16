import { prisma } from "@/lib/prisma";

const STALE_PASSWORD_DAYS = 90;
const MANY_DEVICES_THRESHOLD = 3;
const RECENT_DEVICE_DAYS = 14;
const DISMISS_KEY = "nookline.passwordSecurityDismissedAt";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export type PasswordSecurityAdvice = {
  show: boolean;
  reasons: Array<"stale_password" | "many_devices">;
  passwordAgeDays: number | null;
  trustedDeviceCount: number;
  recentNewDevices: number;
  message: string;
};

export async function getPasswordSecurityAdvice(
  userId: string,
): Promise<PasswordSecurityAdvice> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      passwordChangedAt: true,
      createdAt: true,
      ownedCafes: { select: { id: true }, take: 1 },
      memberships: {
        where: { isActive: true, role: { in: ["OWNER", "MANAGER"] } },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!user) {
    return {
      show: false,
      reasons: [],
      passwordAgeDays: null,
      trustedDeviceCount: 0,
      recentNewDevices: 0,
      message: "",
    };
  }

  // Faqat kafe egasi / menejer
  if (user.ownedCafes.length === 0 && user.memberships.length === 0) {
    return {
      show: false,
      reasons: [],
      passwordAgeDays: null,
      trustedDeviceCount: 0,
      recentNewDevices: 0,
      message: "",
    };
  }

  const since = user.passwordChangedAt ?? user.createdAt;
  const ageMs = Date.now() - since.getTime();
  const passwordAgeDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

  const devices = await prisma.trustedDevice.findMany({
    where: { userId },
    select: { createdAt: true, lastSeenAt: true },
  });
  const recentCut = new Date(Date.now() - RECENT_DEVICE_DAYS * 24 * 60 * 60 * 1000);
  const recentNewDevices = devices.filter((d) => d.createdAt >= recentCut).length;

  const reasons: PasswordSecurityAdvice["reasons"] = [];
  if (passwordAgeDays >= STALE_PASSWORD_DAYS) {
    reasons.push("stale_password");
  }
  if (devices.length >= MANY_DEVICES_THRESHOLD && recentNewDevices >= 2) {
    reasons.push("many_devices");
  }

  const parts: string[] = [];
  if (reasons.includes("stale_password")) {
    parts.push(
      `Parolingiz taxminan ${passwordAgeDays} kundan beri yangilanmagan.`,
    );
  }
  if (reasons.includes("many_devices")) {
    parts.push(
      `So‘nggi ${RECENT_DEVICE_DAYS} kunda ${recentNewDevices} ta yangi qurilmadan kirish kuzatildi (${devices.length} ta ishonchli qurilma).`,
    );
  }

  return {
    show: reasons.length > 0,
    reasons,
    passwordAgeDays,
    trustedDeviceCount: devices.length,
    recentNewDevices,
    message:
      parts.join(" ") +
      " Xavfsizlik uchun Sozlamalar → Parol bo‘limidan kodni yangilang.",
  };
}

export function passwordAdviceDismissStorageKey() {
  return DISMISS_KEY;
}

export function isPasswordAdviceDismissed(storedAt: string | null): boolean {
  if (!storedAt) return false;
  const t = Date.parse(storedAt);
  if (Number.isNaN(t)) return false;
  return Date.now() - t < DISMISS_MS;
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { CafeRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { attachSessionCookie, createSessionToken } from "@/lib/auth";
import { getLoginRedirect } from "@/lib/staff-redirect";
import { isDeviceLoginApprovalEnabled } from "@/lib/device-login-config";
import {
  countTrustedDevices,
  createLoginApproval,
  isTrustedDevice,
  parseDeviceLabel,
  trustDevice,
} from "@/lib/device-login";
import {
  checkRateLimit,
  clientIpFromHeaders,
  rateLimitResponse,
} from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  deviceId: z
    .string()
    .max(80)
    .optional()
    .transform((v) => (v && v.length >= 8 ? v : undefined)),
  deviceLabel: z.string().max(120).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromHeaders(request.headers);
    const ipLimit = checkRateLimit({
      key: `login:ip:${ip}`,
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });
    if (!ipLimit.ok) {
      return rateLimitResponse(ipLimit.retryAfterSec);
    }

    const body = await request.json();
    const { email, password, deviceId, deviceLabel } = loginSchema.parse(body);

    const emailKey = email.trim().toLowerCase();
    const emailLimit = checkRateLimit({
      key: `login:email:${emailKey}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!emailLimit.ok) {
      return rateLimitResponse(emailLimit.retryAfterSec);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Email yoki parol noto'g'ri" },
        { status: 401 },
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Email yoki parol noto'g'ri" },
        { status: 401 },
      );
    }

    const ua = request.headers.get("user-agent");
    const label = deviceLabel?.trim() || parseDeviceLabel(ua);

    const isPlatformUser =
      user.globalRole === "SUPER_ADMIN" || user.globalRole === "PLATFORM_STAFF";

    const approvalEnabled = isDeviceLoginApprovalEnabled();

    if (approvalEnabled && !isPlatformUser && deviceId) {
      // Egasi / menejer — parol yetarli, ikkinchi qurilma tasdig'i shart emas
      const canSelfTrust = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          ownedCafes: {
            where: { status: { not: "CANCELLED" } },
            select: { id: true },
            take: 1,
          },
          memberships: {
            where: {
              isActive: true,
              role: CafeRole.MANAGER,
              cafe: { status: { not: "CANCELLED" } },
            },
            select: { id: true },
            take: 1,
          },
        },
      });
      const isOwnerOrManager = Boolean(
        canSelfTrust?.ownedCafes.length || canSelfTrust?.memberships.length,
      );

      const trustedCount = await countTrustedDevices(user.id);
      const trusted = await isTrustedDevice(user.id, deviceId);

      if (trustedCount > 0 && !trusted && !isOwnerOrManager) {
        const approval = await createLoginApproval({
          userId: user.id,
          deviceId,
          deviceLabel: label,
          userAgent: ua,
          ipAddress: ip === "unknown" ? null : ip,
        });
        return NextResponse.json({
          needsApproval: true,
          requestId: approval.id,
          deviceLabel: label,
          expiresAt: approval.expiresAt.toISOString(),
          message:
            "Bu qurilma yangi. Boshqa telefoningizdagi bildirishnomadan tasdiqlang.",
        });
      }

      await trustDevice({
        userId: user.id,
        deviceId,
        deviceLabel: label,
        userAgent: ua,
      });
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      globalRole: user.globalRole,
      deviceId:
        approvalEnabled && !isPlatformUser ? deviceId || undefined : undefined,
    });

    const redirectTo = await getLoginRedirect(user.id, user.globalRole);

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole,
      },
      redirectTo,
    });
    attachSessionCookie(res, token);
    return res;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
    }
    console.error("Login error:", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

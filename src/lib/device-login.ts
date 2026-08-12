import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { publishCafeEvent } from "@/lib/realtime";

export const LOGIN_APPROVAL_TTL_MS = 10 * 60 * 1000;

export function parseDeviceLabel(userAgent: string | null | undefined): string {
  const ua = userAgent?.trim() || "";
  if (!ua) return "Noma'lum qurilma";

  let os = "Qurilma";
  if (/iPhone/i.test(ua)) os = "iPhone";
  else if (/iPad/i.test(ua)) os = "iPad";
  else if (/Android/i.test(ua)) {
    const model = ua.match(/;\s*([^;)]+)\s+Build\//i);
    if (model?.[1] && !/wv|Linux/i.test(model[1])) {
      os = model[1].trim();
    } else {
      const m = ua.match(/Android\s([\d.]+)/i);
      os = m ? `Android ${m[1]}` : "Android";
    }
  } else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "Mac";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Brauzer";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  return `${os} · ${browser}`;
}

function cuid() {
  return `c${Date.now().toString(36)}${randomBytes(8).toString("hex")}`;
}

export async function countTrustedDevices(userId: string) {
  return prisma.trustedDevice.count({ where: { userId } });
}

export async function listTrustedDevices(userId: string) {
  const rows = await prisma.trustedDevice.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      deviceId: true,
      deviceLabel: true,
      userAgent: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    deviceId: r.deviceId,
    deviceLabel: r.deviceLabel,
    userAgent: r.userAgent,
    lastSeenAt: r.lastSeenAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function revokeTrustedDevice(userId: string, deviceRowId: string) {
  const row = await prisma.trustedDevice.findFirst({
    where: { id: deviceRowId, userId },
    select: { id: true, deviceId: true },
  });
  if (!row) return { error: "Qurilma topilmadi" as const };

  await prisma.trustedDevice.delete({ where: { id: row.id } });
  // Shu qurilmadan kutilayotgan so'rovlarni ham bekor qilish
  await prisma.$executeRaw`
    UPDATE LoginApprovalRequest
    SET status = 'REJECTED', resolvedAt = CURRENT_TIMESTAMP
    WHERE userId = ${userId} AND deviceId = ${row.deviceId} AND status = 'PENDING'
  `;
  return { ok: true as const, deviceId: row.deviceId };
}

/** Barcha ishonchli qurilmalarni o'chirish. keepDeviceId bo'lsa — joriy qurilma qoladi. */
export async function revokeAllTrustedDevices(userId: string, keepDeviceId?: string) {
  if (keepDeviceId) {
    await prisma.trustedDevice.deleteMany({
      where: { userId, deviceId: { not: keepDeviceId } },
    });
    await prisma.$executeRaw`
      UPDATE LoginApprovalRequest
      SET status = 'REJECTED', resolvedAt = CURRENT_TIMESTAMP
      WHERE userId = ${userId} AND status = 'PENDING' AND deviceId != ${keepDeviceId}
    `;
  } else {
    await prisma.trustedDevice.deleteMany({ where: { userId } });
    await prisma.$executeRaw`
      UPDATE LoginApprovalRequest
      SET status = 'REJECTED', resolvedAt = CURRENT_TIMESTAMP
      WHERE userId = ${userId} AND status = 'PENDING'
    `;
  }
  return { ok: true as const };
}

export async function isTrustedDevice(userId: string, deviceId: string) {
  const row = await prisma.trustedDevice.findUnique({
    where: { userId_deviceId: { userId, deviceId } },
    select: { id: true },
  });
  return Boolean(row);
}

export async function trustDevice(opts: {
  userId: string;
  deviceId: string;
  deviceLabel: string;
  userAgent?: string | null;
}) {
  const ua = opts.userAgent ?? null;
  await prisma.trustedDevice.upsert({
    where: {
      userId_deviceId: { userId: opts.userId, deviceId: opts.deviceId },
    },
    create: {
      userId: opts.userId,
      deviceId: opts.deviceId,
      deviceLabel: opts.deviceLabel,
      userAgent: ua,
    },
    update: {
      deviceLabel: opts.deviceLabel,
      userAgent: ua,
      lastSeenAt: new Date(),
    },
  });
}

export async function createLoginApproval(opts: {
  userId: string;
  deviceId: string;
  deviceLabel: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  await prisma.$executeRaw`
    UPDATE LoginApprovalRequest
    SET status = 'EXPIRED', resolvedAt = CURRENT_TIMESTAMP
    WHERE userId = ${opts.userId} AND deviceId = ${opts.deviceId} AND status = 'PENDING'
  `;

  const id = cuid();
  const expiresAt = new Date(Date.now() + LOGIN_APPROVAL_TTL_MS).toISOString();
  const ua = opts.userAgent ?? null;
  const ip = opts.ipAddress ?? null;

  await prisma.$executeRaw`
    INSERT INTO LoginApprovalRequest
      (id, userId, deviceId, deviceLabel, userAgent, ipAddress, status, approvalToken, expiresAt, resolvedAt, createdAt)
    VALUES
      (${id}, ${opts.userId}, ${opts.deviceId}, ${opts.deviceLabel}, ${ua}, ${ip}, 'PENDING', NULL, ${expiresAt}, NULL, CURRENT_TIMESTAMP)
  `;

  const request = {
    id,
    userId: opts.userId,
    deviceId: opts.deviceId,
    deviceLabel: opts.deviceLabel,
    userAgent: ua,
    ipAddress: ip,
    status: "PENDING",
    approvalToken: null as string | null,
    expiresAt: new Date(expiresAt),
    resolvedAt: null as Date | null,
    createdAt: new Date(),
  };

  const memberships = await prisma.$queryRaw<Array<{ cafeId: string }>>`
    SELECT cafeId FROM CafeMember WHERE userId = ${opts.userId} AND isActive = 1
  `;
  const owned = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM Cafe WHERE ownerId = ${opts.userId}
  `;
  const cafeIds = new Set([
    ...memberships.map((m) => m.cafeId),
    ...owned.map((c) => c.id),
  ]);
  const payload = {
    requestId: request.id,
    deviceLabel: request.deviceLabel,
    createdAt: request.createdAt.toISOString(),
  };
  for (const cafeId of cafeIds) {
    publishCafeEvent(cafeId, { type: "login.approval", payload });
  }

  return request;
}

export async function expireStaleApprovals(userId?: string) {
  const now = new Date().toISOString();
  if (userId) {
    await prisma.$executeRaw`
      UPDATE LoginApprovalRequest
      SET status = 'EXPIRED', resolvedAt = ${now}
      WHERE status = 'PENDING' AND expiresAt < ${now} AND userId = ${userId}
    `;
    return;
  }
  await prisma.$executeRaw`
    UPDATE LoginApprovalRequest
    SET status = 'EXPIRED', resolvedAt = ${now}
    WHERE status = 'PENDING' AND expiresAt < ${now}
  `;
}

type ApprovalRow = {
  id: string;
  userId: string;
  deviceId: string;
  deviceLabel: string;
  userAgent: string | null;
  ipAddress: string | null;
  status: string;
  approvalToken: string | null;
  expiresAt: string;
  resolvedAt: string | null;
  createdAt: string;
};

function mapApproval(row: ApprovalRow) {
  return {
    id: row.id,
    userId: row.userId,
    deviceId: row.deviceId,
    deviceLabel: row.deviceLabel,
    userAgent: row.userAgent,
    ipAddress: row.ipAddress,
    status: row.status,
    approvalToken: row.approvalToken,
    expiresAt: new Date(row.expiresAt),
    resolvedAt: row.resolvedAt ? new Date(row.resolvedAt) : null,
    createdAt: new Date(row.createdAt),
  };
}

export async function listPendingApprovals(userId: string) {
  await expireStaleApprovals(userId);
  const rows = await prisma.$queryRaw<ApprovalRow[]>`
    SELECT * FROM LoginApprovalRequest
    WHERE userId = ${userId} AND status = 'PENDING'
    ORDER BY createdAt DESC
    LIMIT 20
  `;
  return rows.map(mapApproval);
}

export async function approveLoginRequest(userId: string, requestId: string) {
  await expireStaleApprovals(userId);
  const rows = await prisma.$queryRaw<ApprovalRow[]>`
    SELECT * FROM LoginApprovalRequest
    WHERE id = ${requestId} AND userId = ${userId} AND status = 'PENDING'
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { error: "So'rov topilmadi yoki muddati o'tgan" as const };

  const mapped = mapApproval(row);
  if (mapped.expiresAt < new Date()) {
    await prisma.$executeRaw`
      UPDATE LoginApprovalRequest
      SET status = 'EXPIRED', resolvedAt = CURRENT_TIMESTAMP
      WHERE id = ${row.id}
    `;
    return { error: "So'rov muddati o'tgan" as const };
  }

  const approvalToken = randomBytes(24).toString("hex");
  await prisma.$executeRaw`
    UPDATE LoginApprovalRequest
    SET status = 'APPROVED', approvalToken = ${approvalToken}, resolvedAt = CURRENT_TIMESTAMP
    WHERE id = ${row.id}
  `;

  await trustDevice({
    userId,
    deviceId: row.deviceId,
    deviceLabel: row.deviceLabel,
    userAgent: row.userAgent,
  });

  return {
    request: {
      ...mapped,
      status: "APPROVED",
      approvalToken,
      resolvedAt: new Date(),
    },
  };
}

export async function rejectLoginRequest(userId: string, requestId: string) {
  const rows = await prisma.$queryRaw<ApprovalRow[]>`
    SELECT * FROM LoginApprovalRequest
    WHERE id = ${requestId} AND userId = ${userId} AND status = 'PENDING'
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { error: "So'rov topilmadi" as const };

  await prisma.$executeRaw`
    UPDATE LoginApprovalRequest
    SET status = 'REJECTED', resolvedAt = CURRENT_TIMESTAMP
    WHERE id = ${row.id}
  `;

  return { request: { ...mapApproval(row), status: "REJECTED", resolvedAt: new Date() } };
}

export async function getApprovalStatus(requestId: string) {
  await expireStaleApprovals();
  const rows = await prisma.$queryRaw<ApprovalRow[]>`
    SELECT * FROM LoginApprovalRequest WHERE id = ${requestId} LIMIT 1
  `;
  return rows[0] ? mapApproval(rows[0]) : null;
}

export async function consumeApprovalToken(requestId: string, approvalToken: string) {
  const rows = await prisma.$queryRaw<ApprovalRow[]>`
    SELECT * FROM LoginApprovalRequest
    WHERE id = ${requestId} AND approvalToken = ${approvalToken} AND status = 'APPROVED'
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { error: "Tasdiq topilmadi" as const };

  const mapped = mapApproval(row);
  if (mapped.expiresAt < new Date()) {
    return { error: "So'rov muddati o'tgan" as const };
  }

  await prisma.$executeRaw`
    UPDATE LoginApprovalRequest SET approvalToken = NULL WHERE id = ${row.id}
  `;

  await trustDevice({
    userId: row.userId,
    deviceId: row.deviceId,
    deviceLabel: row.deviceLabel,
    userAgent: row.userAgent,
  });

  const users = await prisma.$queryRaw<
    Array<{
      id: string;
      email: string;
      name: string;
      globalRole: "SUPER_ADMIN" | "USER";
    }>
  >`
    SELECT id, email, name, globalRole FROM User WHERE id = ${row.userId} LIMIT 1
  `;
  const user = users[0];
  if (!user) return { error: "Foydalanuvchi topilmadi" as const };

  return { user, deviceId: row.deviceId, deviceLabel: row.deviceLabel };
}

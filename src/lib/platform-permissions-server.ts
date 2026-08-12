import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/auth";
import {
  parsePermissionsJson,
  ROLE_PERMISSION_PRESETS,
  type PlatformAccessPerms,
  type PlatformStaffRole,
} from "@/lib/platform-permissions";

export async function getPlatformAccessPermissions(
  session: SessionPayload,
): Promise<PlatformAccessPerms> {
  if (isSuperAdmin(session)) return "ALL";
  if ((session.globalRole as string) !== "PLATFORM_STAFF") return [];

  const rows = await prisma.$queryRaw<
    Array<{ permissions: string | null; isActive: number | boolean; role: string }>
  >`
    SELECT permissions, isActive, role FROM PlatformStaff WHERE userId = ${session.userId} LIMIT 1
  `;
  const row = rows[0];
  if (!row || !row.isActive) return [];

  const parsed = parsePermissionsJson(row.permissions);
  if (parsed.length > 0) return parsed;

  const role = row.role as PlatformStaffRole;
  return ROLE_PERMISSION_PRESETS[role] ?? ROLE_PERMISSION_PRESETS.SUPPORT;
}

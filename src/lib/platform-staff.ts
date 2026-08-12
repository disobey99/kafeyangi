import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import {
  parsePermissionsJson,
  permissionsToJson,
  ROLE_PERMISSION_PRESETS,
  type PlatformPermission,
} from "@/lib/platform-permissions";
import {
  isPlatformStaffRole,
  PLATFORM_STAFF_ROLE_LABELS,
  type PlatformStaffRole,
  type PlatformStaffRow,
} from "@/lib/platform-staff-shared";

export type { PlatformStaffRole, PlatformStaffRow, PlatformPermission };
export { PLATFORM_STAFF_ROLE_LABELS, isPlatformStaffRole, permissionsToJson };

export function isPlatformAccess(session: SessionPayload) {
  return (
    session.globalRole === "SUPER_ADMIN" ||
    (session.globalRole as string) === "PLATFORM_STAFF"
  );
}

function mapStaffRow(r: {
  id: string;
  userId: string;
  role: string;
  permissions: string | null;
  isActive: number | boolean;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string | Date;
}): PlatformStaffRow {
  const role = (isPlatformStaffRole(r.role) ? r.role : "SUPPORT") as PlatformStaffRole;
  const parsed = parsePermissionsJson(r.permissions);
  return {
    id: r.id,
    userId: r.userId,
    role,
    permissions: parsed.length > 0 ? parsed : ROLE_PERMISSION_PRESETS[role],
    isActive: Boolean(r.isActive),
    name: r.name,
    email: r.email,
    phone: r.phone,
    createdAt: new Date(r.createdAt).toISOString(),
  };
}

export async function listPlatformStaff(): Promise<PlatformStaffRow[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      userId: string;
      role: string;
      permissions: string | null;
      isActive: number;
      name: string;
      email: string;
      phone: string | null;
      createdAt: string;
    }>
  >`
    SELECT ps.id, ps.userId, ps.role, ps.permissions, ps.isActive, ps.createdAt,
           u.name, u.email, u.phone
    FROM PlatformStaff ps
    JOIN User u ON u.id = ps.userId
    ORDER BY ps.createdAt DESC
  `;

  return rows.map(mapStaffRow);
}

export async function getPlatformStaffRole(
  userId: string,
): Promise<PlatformStaffRole | null> {
  const rows = await prisma.$queryRaw<Array<{ role: string; isActive: number }>>`
    SELECT role, isActive FROM PlatformStaff WHERE userId = ${userId} LIMIT 1
  `;
  const row = rows[0];
  if (!row || !row.isActive || !isPlatformStaffRole(row.role)) return null;
  return row.role;
}

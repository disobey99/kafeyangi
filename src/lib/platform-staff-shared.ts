import type { PlatformPermission, PlatformStaffRole } from "@/lib/platform-permissions";

export type { PlatformStaffRole };

export type PlatformStaffRow = {
  id: string;
  userId: string;
  role: PlatformStaffRole;
  permissions: PlatformPermission[];
  isActive: boolean;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
};

export const PLATFORM_STAFF_ROLE_LABELS: Record<PlatformStaffRole, string> = {
  ADMIN: "Administrator",
  SUPPORT: "Qo'llab-quvvatlash",
  ANALYST: "Tahlilchi",
};

export function isPlatformStaffRole(value: string): value is PlatformStaffRole {
  return value === "ADMIN" || value === "SUPPORT" || value === "ANALYST";
}

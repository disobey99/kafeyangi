import "server-only";

import { CafeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Faqat omborchi (egasi/nazoratchi emas) — menyuni cheklash */
export async function isWarehouseOnlyViewer(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ownedCafes: {
        where: { status: { not: "CANCELLED" } },
        select: { id: true },
        take: 1,
      },
      memberships: {
        where: { isActive: true, cafe: { status: { not: "CANCELLED" } } },
        select: { role: true },
      },
    },
  });
  if (!user) return false;
  if (user.ownedCafes.length > 0) return false;
  if (user.memberships.some((m) => m.role === CafeRole.MANAGER)) return false;
  if (user.memberships.length === 0) return false;
  return user.memberships.every((m) => m.role === CafeRole.WAREHOUSE);
}

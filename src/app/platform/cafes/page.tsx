import { prisma } from "@/lib/prisma";
import { PlatformCafesTable } from "@/components/platform-cafes-table";
import { hasPlatformPermission } from "@/lib/platform-permissions";
import { getPlatformAccessPermissions } from "@/lib/platform-permissions-server";
import { toIsoDate } from "@/lib/parse-db-date";
import { requirePlatformMenu } from "@/lib/session-guard";

export default async function PlatformCafesPage() {
  const session = await requirePlatformMenu("menu.cafes");
  const perms = await getPlatformAccessPermissions(session);
  const canManage = hasPlatformPermission(perms, "action.cafes.manage");
  const cafes = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      plan: "STARTER" | "STANDARD" | "PRO";
      address: string | null;
      region: string | null;
      phone: string | null;
      latitude: number | null;
      longitude: number | null;
      trialEndsAt: string | number | bigint | null;
      subscriptionEndsAt: string | number | bigint | null;
      suspendReason: string | null;
      ownerName: string;
      ownerEmail: string;
      ownerPhone: string | null;
    }>
  >`
    SELECT c.id, c.name, c.slug, c.status, c.plan, c.address, c.region, c.phone,
           c.latitude, c.longitude, c.trialEndsAt, c.subscriptionEndsAt, c.suspendReason,
           u.name AS ownerName, u.email AS ownerEmail, u.phone AS ownerPhone
    FROM Cafe c
    JOIN User u ON u.id = c.ownerId
    ORDER BY c.createdAt DESC
  `;

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Mijozlar</h1>
      <p className="mt-1 text-stone-500">
        {cafes.length} ta mijoz (kafe) — tahrirlash, tarif, hudud va sinov muddati
      </p>

      <PlatformCafesTable
        canManage={canManage}
        cafes={cafes.map((cafe) => ({
          id: cafe.id,
          name: cafe.name,
          slug: cafe.slug,
          status: cafe.status,
          plan: cafe.plan,
          address: cafe.address,
          region: cafe.region,
          phone: cafe.phone,
          latitude: cafe.latitude,
          longitude: cafe.longitude,
          trialEndsAt: toIsoDate(cafe.trialEndsAt),
          subscriptionEndsAt: toIsoDate(cafe.subscriptionEndsAt),
          suspendReason: cafe.suspendReason,
          owner: {
            name: cafe.ownerName,
            email: cafe.ownerEmail,
            phone: cafe.ownerPhone,
          },
        }))}
      />
    </div>
  );
}

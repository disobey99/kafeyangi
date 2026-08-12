import { prisma } from "@/lib/prisma";
import { PlatformMap } from "@/components/platform-map";
import { coordsForRegion } from "@/lib/uz-regions";
import { requirePlatformMenu } from "@/lib/session-guard";

export default async function PlatformMapPage() {
  await requirePlatformMenu("menu.map");
  const cafes = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      plan: string;
      address: string | null;
      region: string | null;
      latitude: number | null;
      longitude: number | null;
      phone: string | null;
      orderCount: number | bigint;
      tableCount: number | bigint;
    }>
  >`
    SELECT c.id, c.name, c.slug, c.status, c.plan, c.address, c.region,
           c.latitude, c.longitude, c.phone,
           (SELECT COUNT(*) FROM "Order" o WHERE o.cafeId = c.id) AS orderCount,
           (SELECT COUNT(*) FROM "Table" t WHERE t.cafeId = c.id AND t.isActive = 1) AS tableCount
    FROM Cafe c
    WHERE c.status IN ('ACTIVE', 'TRIAL', 'SUSPENDED')
    ORDER BY c.name ASC
  `;

  const withCoords = cafes.map((c) => {
    const hasExact = c.latitude != null && c.longitude != null;
    let latitude = c.latitude;
    let longitude = c.longitude;
    if (latitude == null || longitude == null) {
      const coords = coordsForRegion(c.region);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      plan: c.plan,
      address: c.address,
      region: c.region,
      latitude,
      longitude,
      phone: c.phone,
      locationExact: hasExact,
      _count: {
        orders: Number(c.orderCount),
        tables: Number(c.tableCount),
      },
    };
  });

  const mapped = withCoords.filter((c) => c.latitude != null || c.region).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Xarita</h1>
      <p className="mt-1 text-stone-500">
        Qaysi hududda nechta mijoz (kafe) ishlayotganini kuzating ({mapped} /{" "}
        {cafes.length} xaritada)
      </p>
      <PlatformMap cafes={withCoords} />
    </div>
  );
}

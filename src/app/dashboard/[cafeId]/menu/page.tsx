import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { MenuEditor } from "@/components/menu-editor";
import { PrepStationsManager } from "@/components/prep-stations-manager";
import { ensureDefaultPrepStation, listPrepStations } from "@/lib/prep-stations";

export default async function MenuPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;

  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
          products: {
            orderBy: { sortOrder: "asc" },
            include: { prepStation: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!cafe) notFound();

  await ensureDefaultPrepStation(cafeId);
  const stations = await listPrepStations(cafeId, true);

  return (
    <>
      <PrepStationsManager cafeId={cafe.id} />
      <MenuEditor cafeId={cafe.id} categories={cafe.categories} stations={stations} />
    </>
  );
}

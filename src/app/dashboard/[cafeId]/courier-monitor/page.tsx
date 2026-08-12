import { notFound } from "next/navigation";
import { CourierMonitorMap } from "@/components/courier-monitor-map";
import { prisma } from "@/lib/prisma";

export default async function CourierMonitorPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: { id: true },
  });
  if (!cafe) notFound();

  return <CourierMonitorMap cafeId={cafeId} />;
}

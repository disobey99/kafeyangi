import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AppSettingsManager } from "@/components/app-settings-manager";

export default async function AppSettingsPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) notFound();
  return <AppSettingsManager cafeId={cafe.id} />;
}

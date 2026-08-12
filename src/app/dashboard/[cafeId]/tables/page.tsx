import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerBaseUrl } from "@/lib/server-url";
import { getActiveCafeTables } from "@/lib/cafe-tables";
import { getCafePlanContext } from "@/lib/plan-access";
import { TablesManager } from "@/components/tables-manager";

export default async function TablesPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;

  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: { id: true, name: true, slug: true },
  });

  if (!cafe) notFound();

  const [tables, planCtx] = await Promise.all([
    getActiveCafeTables(cafeId),
    getCafePlanContext(cafeId),
  ]);

  const baseUrl = await getServerBaseUrl();
  const isLocalhost = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  return (
    <TablesManager
      cafeId={cafe.id}
      cafeSlug={cafe.slug}
      initialTables={tables}
      maxTables={planCtx?.config.maxTables ?? 20}
      planName={planCtx?.baseConfig?.name ?? planCtx?.config.name ?? "Starter"}
      isTrialBoost={planCtx?.isTrialBoost ?? false}
      baseUrl={baseUrl}
      isLocalhost={isLocalhost}
    />
  );
}

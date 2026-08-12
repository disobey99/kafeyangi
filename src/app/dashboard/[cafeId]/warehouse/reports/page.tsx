import { renderWarehousePage } from "@/app/dashboard/[cafeId]/warehouse/_warehouse-page";

export default async function WarehouseReportsPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  return renderWarehousePage(cafeId, "reports");
}


import { renderWarehousePage } from "@/app/dashboard/[cafeId]/warehouse/_warehouse-page";

export default async function WarehouseCountsPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  return renderWarehousePage(cafeId, "counts");
}


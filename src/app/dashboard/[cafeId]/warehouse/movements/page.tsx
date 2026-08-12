import { renderWarehousePage } from "@/app/dashboard/[cafeId]/warehouse/_warehouse-page";

export default async function WarehouseMovementsPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  return renderWarehousePage(cafeId, "movements");
}


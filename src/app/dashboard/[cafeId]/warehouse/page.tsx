import { renderWarehousePage } from "@/app/dashboard/[cafeId]/warehouse/_warehouse-page";

export default async function WarehousePage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  return renderWarehousePage(cafeId, "stock");
}


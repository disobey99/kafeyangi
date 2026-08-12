import { renderWarehousePage } from "../_warehouse-page";

export default async function WarehouseSuppliersPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  return renderWarehousePage(cafeId, "suppliers");
}

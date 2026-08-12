import { redirect } from "next/navigation";

export default async function CafeDashboardPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  redirect(`/dashboard/${cafeId}/menu`);
}

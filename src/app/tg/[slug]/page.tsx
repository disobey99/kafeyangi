import { redirect } from "next/navigation";

/** Eski Mini App yo‘li — PWA bilan bir xil ilovaga */
export default async function TelegramMiniAppRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/c/${slug}/app?src=tg`);
}

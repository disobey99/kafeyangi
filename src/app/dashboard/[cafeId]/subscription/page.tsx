import { SubscriptionPanel } from "@/components/subscription-panel";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) notFound();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--dp-accent)]">
          Obuna
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--dp-text)] sm:text-3xl">
          Tarif va limitlar
        </h1>
        <p className="mt-1.5 text-sm text-[var(--dp-muted)]">
          Joriy reja, foydalanish va tariflarni solishtirish
        </p>
      </header>
      <SubscriptionPanel cafeId={cafeId} />
    </div>
  );
}

import { LoyaltyDashboard } from "@/components/loyalty-dashboard";

export default async function LoyaltyPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--dp-accent)]">
          Mijozlar
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--dp-text)]">Sodiqlik kartasi</h1>
        <p className="mt-1 text-sm text-[var(--dp-muted)]">
          Keshbek, aksiyalar va ijtimoiy tarmoq havolalari
        </p>
      </header>
      <LoyaltyDashboard cafeId={cafeId} />
    </div>
  );
}

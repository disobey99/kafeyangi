import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DashboardThemePicker } from "@/components/dashboard-theme-picker";
import { TelegramSettings } from "@/components/telegram-settings";
import { TelegramOwnerLink } from "@/components/telegram-owner-link";
import { CafeBusinessSettings } from "@/components/cafe-business-settings";
import { PaymentOfdSettings } from "@/components/payment-ofd-settings";
import { SupportButton } from "@/components/support-button";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await params;
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) notFound();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--dp-accent)]">
            Sozlamalar
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--dp-text)]">Kafe sozlamalari</h1>
        </div>
        <SupportButton cafeId={cafe.id} />
      </header>

      <section className="dp-card rounded-2xl p-6">
        <DashboardThemePicker cafeId={cafe.id} />
      </section>

      <section className="dp-card rounded-2xl p-6">
        <CafeBusinessSettings cafeId={cafe.id} />
      </section>

      <section className="dp-card rounded-2xl p-6">
        <TelegramOwnerLink embedded />
      </section>

      <section className="dp-card rounded-2xl p-6">
        <TelegramSettings cafeId={cafe.id} embedded />
      </section>

      <section className="dp-card rounded-2xl p-6">
        <PaymentOfdSettings cafeId={cafe.id} />
      </section>
    </div>
  );
}

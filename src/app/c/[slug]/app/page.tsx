import { notFound } from "next/navigation";
import { DeliveryAppShell } from "@/components/delivery-app/delivery-app-shell";
import { PlanUpgradeCard } from "@/components/plan-upgrade-card";
import { loadCafeOnlineCatalog } from "@/lib/cafe-online-catalog";
import { renderCustomerCafeBlockedIfNeeded } from "@/lib/customer-cafe-gate";
import { getCafePlanContext } from "@/lib/plan-access";
import { prisma } from "@/lib/prisma";

export default async function CafeDeliveryAppPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const cafeMeta = await prisma.cafe.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      status: true,
      suspendReason: true,
      logoUrl: true,
      menuPrimaryColor: true,
      loyaltyEnabled: true,
      subscriptionEndsAt: true,
      trialEndsAt: true,
    },
  });

  if (!cafeMeta) notFound();

  const blockedScreen = await renderCustomerCafeBlockedIfNeeded(slug, cafeMeta);
  if (blockedScreen) return blockedScreen;

  const planCtx = await getCafePlanContext(cafeMeta.id);
  if (!planCtx?.config.features.onlineOrders) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F5F5F5] p-4">
        <PlanUpgradeCard
          feature="onlineOrders"
          currentPlan={planCtx?.config.name}
        />
      </div>
    );
  }

  const catalog = await loadCafeOnlineCatalog(slug);
  if (!catalog) notFound();

  const { cafe, categories, initialPromo, homePromos, notices } = catalog;

  const supportRows = await prisma.$queryRaw<Array<{ supportPhone: string | null }>>`
    SELECT supportPhone FROM Cafe WHERE id = ${cafe.id} LIMIT 1
  `;

  return (
    <DeliveryAppShell
      menuSlug={slug}
      cafeId={cafe.id}
      cafeName={cafe.name}
      logoUrl={cafe.logoUrl}
      social={{
        instagram: cafe.socialInstagram,
        telegram: cafe.socialTelegram,
        facebook: cafe.socialFacebook,
      }}
      supportPhone={supportRows[0]?.supportPhone ?? null}
      paymeEnabled={cafe.paymeEnabled}
      minOrderAmountSom={Math.floor(cafe.minOrderAmount / 100)}
      deliveryFeeSom={Math.floor(cafe.deliveryFee / 100)}
      deliveryTimeMinutes={cafe.deliveryTimeMinutes}
      deliveryEnabled={cafe.deliveryEnabled}
      menuPrimaryColor={cafe.menuPrimaryColor ?? "#0d9488"}
      loyaltyEnabled={cafeMeta.loyaltyEnabled}
      categories={categories}
      initialPromo={initialPromo}
      homePromos={homePromos}
      notices={notices}
    />
  );
}

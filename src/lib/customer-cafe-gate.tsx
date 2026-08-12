import type { CafeSuspendReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BILLING_GRACE_DAYS } from "@/lib/billing-constants";
import { getCafeBlockReason } from "@/lib/cafe-public-access";
import { resolveCustomerBlockVariant } from "@/lib/cafe-suspension";
import { getPublicSupportContacts } from "@/lib/platform-settings";
import { CustomerCafeBlockedScreen } from "@/components/customer-cafe-blocked-screen";

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Obuna/trial muddati o'tgach avtomatik bloklash (3 kunlik imtiyozdan keyin) */
export async function enforceBillingGraceForCafe(cafeId: string): Promise<void> {
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) return;

  const now = new Date();

  if (cafe.status === "TRIAL" && cafe.trialEndsAt && cafe.trialEndsAt < now) {
    await prisma.cafe.update({
      where: { id: cafeId },
      data: { status: "SUSPENDED", suspendReason: "TRIAL" },
    });
    return;
  }

  if (
    cafe.status === "ACTIVE" &&
    cafe.subscriptionEndsAt &&
    cafe.suspendReason !== "ADMIN"
  ) {
    const graceEnd = addDays(cafe.subscriptionEndsAt, BILLING_GRACE_DAYS);
    if (now > graceEnd) {
      await prisma.cafe.update({
        where: { id: cafeId },
        data: { status: "SUSPENDED", suspendReason: "BILLING" },
      });
    }
  }
}

export async function renderCustomerCafeBlockedIfNeeded(
  slug: string,
  cafe: {
    id: string;
    name: string;
    status: string;
    suspendReason: CafeSuspendReason | null;
    logoUrl: string | null;
    menuPrimaryColor: string | null;
    subscriptionEndsAt: Date | null;
    trialEndsAt: Date | null;
  },
) {
  await enforceBillingGraceForCafe(cafe.id);

  const fresh = await prisma.cafe.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      status: true,
      suspendReason: true,
      logoUrl: true,
      menuPrimaryColor: true,
      subscriptionEndsAt: true,
      trialEndsAt: true,
    },
  });

  if (!fresh) return null;

  const blockReason = getCafeBlockReason(fresh.status);
  if (!blockReason) return null;

  const variant = resolveCustomerBlockVariant(fresh);
  const support = getPublicSupportContacts();

  return (
    <CustomerCafeBlockedScreen
      slug={slug}
      cafeId={fresh.id}
      cafeName={fresh.name}
      logoUrl={fresh.logoUrl}
      menuPrimaryColor={fresh.menuPrimaryColor}
      variant={variant}
      suspendReason={fresh.suspendReason}
      support={support}
    />
  );
}

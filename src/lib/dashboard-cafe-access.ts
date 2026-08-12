import type { CafeSuspendReason } from "@prisma/client";
import { getCafeBlockReason } from "@/lib/cafe-public-access";
import {
  resolveCustomerBlockVariant,
  type CustomerBlockVariant,
} from "@/lib/cafe-suspension";
import { getPublicSupportContacts } from "@/lib/platform-settings";
import type { PublicSupportContacts } from "@/lib/platform-settings";

export type DashboardAccessBlock = {
  blocked: true;
  variant: CustomerBlockVariant;
  suspendReason: CafeSuspendReason | null;
  support: PublicSupportContacts;
};

export type DashboardCafeAccessState =
  | { blocked: false }
  | DashboardAccessBlock;

type CafeAccessFields = {
  status: string;
  suspendReason: CafeSuspendReason | null;
  subscriptionEndsAt: Date | null;
  trialEndsAt: Date | null;
};

export function getDashboardCafeAccessState(
  cafe: CafeAccessFields,
): DashboardCafeAccessState {
  const blockReason = getCafeBlockReason(cafe.status);
  if (!blockReason) return { blocked: false };

  return {
    blocked: true,
    variant: resolveCustomerBlockVariant(cafe),
    suspendReason: cafe.suspendReason,
    support: getPublicSupportContacts(),
  };
}

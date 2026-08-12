import type { CafeSuspendReason } from "@prisma/client";
import { BILLING_GRACE_DAYS } from "@/lib/billing-constants";

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export type CustomerBlockVariant = "admin" | "billing";

type CafeSuspendFields = {
  status: string;
  suspendReason: CafeSuspendReason | null;
  subscriptionEndsAt?: Date | null;
  trialEndsAt?: Date | null;
};

export function resolveCustomerBlockVariant(
  cafe: CafeSuspendFields,
): CustomerBlockVariant {
  if (cafe.status === "CANCELLED") return "admin";
  if (cafe.suspendReason === "ADMIN") return "admin";
  if (cafe.suspendReason === "BILLING" || cafe.suspendReason === "TRIAL") {
    return "billing";
  }

  if (cafe.status === "SUSPENDED") {
    const now = new Date();
    if (cafe.trialEndsAt && cafe.trialEndsAt < now) return "billing";
    if (cafe.subscriptionEndsAt) {
      const graceEnd = addDays(cafe.subscriptionEndsAt, BILLING_GRACE_DAYS);
      if (now > graceEnd) return "billing";
    }
    return "admin";
  }

  return "admin";
}

export function getSuspendReasonLabel(
  reason: CafeSuspendReason | null,
  status: string,
): string | null {
  if (status !== "SUSPENDED" && status !== "CANCELLED") return null;
  if (status === "CANCELLED") return "Bekor qilingan";
  if (reason === "ADMIN") return "Admin blok";
  if (reason === "BILLING") return "To'lov muddati";
  if (reason === "TRIAL") return "Sinov tugadi";
  return "Bloklangan";
}

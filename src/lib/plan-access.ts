import { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlanConfig, getEffectivePlanConfig, PLAN_FEATURE_LABELS, type PlanId, type PlanFeatures } from "@/lib/plans";
import { parseDbDate } from "@/lib/parse-db-date";

type CafeSub = {
  id: string;
  plan: SubscriptionPlan;
  status: string;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
};

const DEFAULT_SUBSCRIPTION_DAYS = 30;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function toDate(value: Date | string | number | bigint | null | undefined): Date | null {
  return parseDbDate(value);
}

type PlatformSubscriptionPatch = {
  status?: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
  trialEndsAt?: Date | null;
  subscriptionEndsAt?: Date | null;
};

/** Super admin panelidan obuna holatini to'g'ri yangilash */
export function applyPlatformSubscriptionPatch(
  existing: {
    status: string;
    trialEndsAt: Date | string | null;
    subscriptionEndsAt: Date | string | null;
  },
  input: {
    status?: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
    plan?: string;
    extendDays?: number;
    trialEndsAt?: Date | null;
  },
  patch: PlatformSubscriptionPatch,
) {
  const now = new Date();
  const grantDays = input.extendDays ?? DEFAULT_SUBSCRIPTION_DAYS;
  const currentTrialEnd = toDate(existing.trialEndsAt);
  const currentSubEnd = toDate(existing.subscriptionEndsAt);
  const mergedStatus = patch.status ?? input.status ?? existing.status;

  if (input.status === "ACTIVE") {
    patch.status = "ACTIVE";
    const subEnd = patch.subscriptionEndsAt ?? currentSubEnd;
    if (!subEnd || subEnd < now) {
      patch.subscriptionEndsAt = addDays(now, grantDays);
    }
    if (input.trialEndsAt === undefined) {
      patch.trialEndsAt = null;
    }
  }

  if (input.plan !== undefined) {
    const nextTrialEnd =
      input.trialEndsAt !== undefined ? input.trialEndsAt : currentTrialEnd;
    const trialExtendedInRequest =
      input.trialEndsAt !== undefined &&
      input.trialEndsAt != null &&
      input.trialEndsAt > now;
    const trialExpired =
      mergedStatus === "TRIAL" &&
      !trialExtendedInRequest &&
      nextTrialEnd != null &&
      nextTrialEnd < now;
    const subExpired =
      mergedStatus === "ACTIVE" && currentSubEnd != null && currentSubEnd < now;

    if (
      trialExpired &&
      patch.status !== "SUSPENDED" &&
      patch.status !== "CANCELLED" &&
      input.status !== "SUSPENDED" &&
      input.status !== "CANCELLED"
    ) {
      patch.status = "ACTIVE";
      patch.trialEndsAt = null;
      if (!patch.subscriptionEndsAt) {
        patch.subscriptionEndsAt =
          currentSubEnd && currentSubEnd > now
            ? currentSubEnd
            : addDays(now, grantDays);
      }
    } else if (subExpired && !patch.subscriptionEndsAt) {
      patch.subscriptionEndsAt = addDays(now, grantDays);
    }
  }
}

export function getSubscriptionStatus(cafe: CafeSub) {
  const now = new Date();

  if (cafe.status === "SUSPENDED") {
    return { active: false, reason: "Kafe to'xtatilgan" };
  }
  if (cafe.status === "CANCELLED") {
    return { active: false, reason: "Obuna bekor qilingan" };
  }
  if (cafe.status === "TRIAL" && cafe.trialEndsAt && cafe.trialEndsAt < now) {
    return { active: false, reason: "Sinov muddati tugadi" };
  }
  if (
    cafe.status === "ACTIVE" &&
    cafe.subscriptionEndsAt &&
    cafe.subscriptionEndsAt < now
  ) {
    return { active: false, reason: "Obuna muddati tugadi" };
  }

  return { active: true, reason: null as string | null };
}

export async function getCafePlanContext(cafeId: string) {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: {
      id: true,
      plan: true,
      status: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
      _count: { select: { tables: true, members: true, products: true } },
    },
  });

  if (!cafe) return null;

  const baseConfig = getPlanConfig(cafe.plan as PlanId);
  const config = getEffectivePlanConfig(cafe.plan as PlanId, cafe.status);
  const subscription = getSubscriptionStatus(cafe);

  return {
    cafe,
    config,
    baseConfig,
    isTrialBoost: cafe.status === "TRIAL",
    subscription,
    usage: {
      tables: cafe._count.tables,
      staff: cafe._count.members,
      products: cafe._count.products,
    },
  };
}

export async function checkPlanLimit(
  cafeId: string,
  limit: "tables" | "staff" | "products"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getCafePlanContext(cafeId);
  if (!ctx) return { ok: false, error: "Kafe topilmadi" };
  if (!ctx.subscription.active) {
    return { ok: false, error: ctx.subscription.reason ?? "Obuna faol emas" };
  }

  const { config, usage } = ctx;
  const limits = {
    tables: { max: config.maxTables, current: usage.tables, label: "stol" },
    staff: { max: config.maxStaff, current: usage.staff, label: "xodim" },
    products: { max: config.maxProducts, current: usage.products, label: "mahsulot" },
  }[limit];

  if (usage[limit === "staff" ? "staff" : limit] >= limits.max) {
    return {
      ok: false,
      error: `${config.name} tarifida maksimum ${limits.max} ta ${limits.label}. Tarifni yangilang.`,
    };
  }

  return { ok: true };
}

export async function checkPlanFeature(
  cafeId: string,
  feature: keyof PlanFeatures
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getCafePlanContext(cafeId);
  if (!ctx) return { ok: false, error: "Kafe topilmadi" };
  if (!ctx.subscription.active) {
    return { ok: false, error: ctx.subscription.reason ?? "Obuna faol emas" };
  }
  if (!ctx.config.features[feature]) {
    const label = PLAN_FEATURE_LABELS[feature] ?? feature;
    const needsPro = !getPlanConfig("STANDARD").features[feature];
    return {
      ok: false,
      error: needsPro
        ? `"${label}" faqat Pro tarifida. Tarifni yangilang.`
        : `"${label}" ${ctx.config.name} tarifida yo'q. Standard yoki Pro tarifga o'ting.`,
    };
  }
  return { ok: true };
}

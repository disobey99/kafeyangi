import { LoyaltyProgramType, LoyaltyRedeemPeriod } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** 1000 so'm = 1 ball (eski ball tizimi) */
export const LOYALTY_POINTS_PER_1000_SOM = 1;
export const LOYALTY_REDEEM_POINTS = 100;
export const LOYALTY_REDEEM_DISCOUNT_TIYIN = 1_000_000;

export type LoyaltyProgramConfig = {
  enabled: boolean;
  programType: LoyaltyProgramType;
  redeemPeriod: LoyaltyRedeemPeriod;
  cashbackPercent: number;
  terms: string;
  redeemPeriodLabel: string;
};

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9) return `998${digits}`;
  if (digits.startsWith("998")) return digits;
  return digits;
}

export function redeemPeriodLabel(period: LoyaltyRedeemPeriod): string {
  return period === "WEEK" ? "haftada bir marta" : "oyda bir marta";
}

export function defaultLoyaltyTerms(
  programType: LoyaltyProgramType,
  cashbackPercent: number,
  redeemPeriod: LoyaltyRedeemPeriod,
): string {
  const freq = redeemPeriodLabel(redeemPeriod);
  if (programType === "PROMOTIONS") {
    return (
      `Sodiqlik dasturi orqali omadli ishtirokchilar maxsus aksiyalarda qatnashish imkoniga ega. ` +
      `Bundan tashqari har safar kelganingizda buyurtmalaringizdan ${cashbackPercent}% keshbek yig'iladi. ` +
      `Keshbek naqd pul emas — faqat to'lov vaqtida chegirma sifatida ishlatiladi (${freq}).`
    );
  }
  return (
    `Har buyurtmada ${cashbackPercent}% keshbek yig'iladi. ` +
    `Keshbek naqd pul emas — to'lov vaqtida chegirma sifatida ishlatiladi (${freq}). ` +
    `Telefon raqamingizni buyurtma berishda kiriting yoki Telegram bot orqali keshbekingizni ko'ring.`
  );
}

export async function getLoyaltyProgramConfig(cafeId: string): Promise<LoyaltyProgramConfig> {
  const disabled: LoyaltyProgramConfig = {
    enabled: false,
    programType: "CASHBACK",
    redeemPeriod: "MONTH",
    cashbackPercent: 5,
    terms: "",
    redeemPeriodLabel: redeemPeriodLabel("MONTH"),
  };

  type LoyaltyRow = {
    loyaltyEnabled: number | boolean;
    loyaltyTerms: string | null;
    loyaltyProgramType: string;
    loyaltyRedeemPeriod: string;
    loyaltyCashbackPercent: number;
  };

  let row: LoyaltyRow | null = null;

  try {
    const cafe = await prisma.cafe.findUnique({
      where: { id: cafeId },
      select: {
        loyaltyEnabled: true,
        loyaltyTerms: true,
        loyaltyProgramType: true,
        loyaltyRedeemPeriod: true,
        loyaltyCashbackPercent: true,
      },
    });
    if (!cafe) return disabled;
    row = cafe;
  } catch {
    try {
      const rows = await prisma.$queryRaw<LoyaltyRow[]>`
        SELECT loyaltyEnabled, loyaltyTerms, loyaltyProgramType, loyaltyRedeemPeriod, loyaltyCashbackPercent
        FROM Cafe WHERE id = ${cafeId} LIMIT 1
      `;
      row = rows[0] ?? null;
    } catch {
      return disabled;
    }
  }

  if (!row) return disabled;

  const redeemPeriod = (row.loyaltyRedeemPeriod as LoyaltyRedeemPeriod) || "MONTH";
  const programType = (row.loyaltyProgramType as LoyaltyProgramType) || "CASHBACK";
  const cashbackPercent = row.loyaltyCashbackPercent ?? 5;

  return {
    enabled: Boolean(row.loyaltyEnabled),
    programType,
    redeemPeriod,
    cashbackPercent,
    terms:
      row.loyaltyTerms?.trim() ||
      defaultLoyaltyTerms(programType, cashbackPercent, redeemPeriod),
    redeemPeriodLabel: redeemPeriodLabel(redeemPeriod),
  };
}

export function calcEarnPoints(totalTiyin: number): number {
  const som = Math.floor(totalTiyin / 100);
  return Math.floor(som / 1000) * LOYALTY_POINTS_PER_1000_SOM;
}

export function calcCashbackEarn(totalTiyin: number, percent: number): number {
  if (percent <= 0) return 0;
  return Math.floor((totalTiyin * percent) / 100);
}

function sameCalendarMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function sameCalendarWeek(a: Date, b: Date): boolean {
  const startOfWeek = (d: Date) => {
    const x = new Date(d);
    const day = x.getDay() || 7;
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - day + 1);
    return x.getTime();
  };
  return startOfWeek(a) === startOfWeek(b);
}

export function canRedeemCashbackNow(
  lastRedeemAt: Date | null | undefined,
  period: LoyaltyRedeemPeriod,
  now = new Date(),
): boolean {
  if (!lastRedeemAt) return true;
  if (period === "WEEK") return !sameCalendarWeek(lastRedeemAt, now);
  return !sameCalendarMonth(lastRedeemAt, now);
}

export async function getLoyaltyBalance(cafeId: string, phone: string) {
  const normalized = normalizePhone(phone);
  const [customer, config] = await Promise.all([
    prisma.loyaltyCustomer.findUnique({
      where: { cafeId_phone: { cafeId, phone: normalized } },
    }),
    getLoyaltyProgramConfig(cafeId),
  ]);

  const cashbackTiyin = customer?.cashbackBalanceTiyin ?? 0;
  const canRedeemCashback =
    config.enabled &&
    cashbackTiyin > 0 &&
    canRedeemCashbackNow(customer?.lastCashbackRedeemAt, config.redeemPeriod);

  return {
    phone: normalized,
    points: customer?.points ?? 0,
    visitCount: customer?.visitCount ?? 0,
    cashbackTiyin,
    cashbackSom: Math.floor(cashbackTiyin / 100),
    canRedeem: (customer?.points ?? 0) >= LOYALTY_REDEEM_POINTS,
    canRedeemCashback,
    redeemDiscountSom: LOYALTY_REDEEM_DISCOUNT_TIYIN / 100,
    program: config,
  };
}

export async function applyLoyaltyEarn(
  cafeId: string,
  phone: string,
  orderId: string,
  totalTiyin: number,
) {
  const config = await getLoyaltyProgramConfig(cafeId);
  if (!config.enabled) return null;

  const normalized = normalizePhone(phone);
  const points = calcEarnPoints(totalTiyin);
  const cashbackTiyin = calcCashbackEarn(totalTiyin, config.cashbackPercent);
  if (points <= 0 && cashbackTiyin <= 0) return null;

  const customer = await prisma.loyaltyCustomer.upsert({
    where: { cafeId_phone: { cafeId, phone: normalized } },
    create: {
      cafeId,
      phone: normalized,
      points,
      cashbackBalanceTiyin: cashbackTiyin,
      totalSpent: totalTiyin,
      visitCount: 1,
      ...(points > 0
        ? {
            transactions: {
              create: {
                orderId,
                points,
                type: "EARN" as const,
                note: "Buyurtma uchun ball",
              },
            },
          }
        : {}),
    },
    update: {
      ...(points > 0 ? { points: { increment: points } } : {}),
      ...(cashbackTiyin > 0 ? { cashbackBalanceTiyin: { increment: cashbackTiyin } } : {}),
      totalSpent: { increment: totalTiyin },
      visitCount: { increment: 1 },
      ...(points > 0
        ? {
            transactions: {
              create: {
                orderId,
                points,
                type: "EARN" as const,
                note: "Buyurtma uchun ball",
              },
            },
          }
        : {}),
    },
  });

  return customer;
}

export async function applyCashbackRedeem(
  cafeId: string,
  phone: string,
  orderId: string,
  amountTiyin: number,
) {
  const normalized = normalizePhone(phone);
  const config = await getLoyaltyProgramConfig(cafeId);
  const customer = await prisma.loyaltyCustomer.findUnique({
    where: { cafeId_phone: { cafeId, phone: normalized } },
  });

  if (!customer || !config.enabled) {
    return { ok: false as const, discountTiyin: 0 };
  }
  if (!canRedeemCashbackNow(customer.lastCashbackRedeemAt, config.redeemPeriod)) {
    return { ok: false as const, discountTiyin: 0, reason: "period" as const };
  }

  const useTiyin = Math.min(amountTiyin, customer.cashbackBalanceTiyin);
  if (useTiyin <= 0) return { ok: false as const, discountTiyin: 0 };

  await prisma.loyaltyCustomer.update({
    where: { id: customer.id },
    data: {
      cashbackBalanceTiyin: { decrement: useTiyin },
      lastCashbackRedeemAt: new Date(),
      transactions: {
        create: {
          orderId,
          points: 0,
          type: "REDEEM",
          note: `Keshbek ishlatildi: ${Math.floor(useTiyin / 100)} so'm`,
        },
      },
    },
  });

  return { ok: true as const, discountTiyin: useTiyin };
}

export async function applyLoyaltyRedeem(cafeId: string, phone: string, orderId: string) {
  const normalized = normalizePhone(phone);
  const customer = await prisma.loyaltyCustomer.findUnique({
    where: { cafeId_phone: { cafeId, phone: normalized } },
  });

  if (!customer || customer.points < LOYALTY_REDEEM_POINTS) {
    return { ok: false as const, discountTiyin: 0 };
  }

  await prisma.loyaltyCustomer.update({
    where: { id: customer.id },
    data: {
      points: { decrement: LOYALTY_REDEEM_POINTS },
      transactions: {
        create: {
          orderId,
          points: -LOYALTY_REDEEM_POINTS,
          type: "REDEEM",
          note: "Chegirma uchun ball ishlatildi",
        },
      },
    },
  });

  return { ok: true as const, discountTiyin: LOYALTY_REDEEM_DISCOUNT_TIYIN };
}

export function formatLoyaltyBotMessage(
  cafeName: string,
  balance: Awaited<ReturnType<typeof getLoyaltyBalance>>,
): string {
  const lines = [
    `🏪 <b>${cafeName}</b>`,
    `📞 ${balance.phone}`,
    `💳 Keshbek: <b>${balance.cashbackSom.toLocaleString("uz-UZ")} so'm</b>`,
    `🎁 Ball: <b>${balance.points}</b>`,
    `👣 Tashriflar: ${balance.visitCount}`,
  ];
  if (balance.canRedeemCashback) {
    lines.push(`✅ Keshbekni to'lovda ishlatish mumkin (${balance.program.redeemPeriodLabel})`);
  } else if (balance.cashbackTiyin > 0) {
    lines.push(`⏳ Keshbek keyingi davrda ishlatiladi (${balance.program.redeemPeriodLabel})`);
  }
  return lines.join("\n");
}

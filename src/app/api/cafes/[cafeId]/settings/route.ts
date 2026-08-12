import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCafeManager } from "@/lib/cafe-access";
import { sendDailyReportsForCafe } from "@/lib/daily-report";
import { checkPlanFeature, getCafePlanContext } from "@/lib/plan-access";
import { getTelegramBotUsername } from "@/lib/telegram";
import {
  buildPlatformHost,
  getPlatformRootDomain,
  isReservedSubdomain,
  normalizeCustomHost,
  normalizeSubdomainLabel,
} from "@/lib/platform-domain";
import { replaceLocalUpload } from "@/lib/uploads";
import {
  DEFAULT_BUSINESS_HOURS,
  parseBusinessHours,
} from "@/lib/cafe-business-hours";

const schema = z.object({
  telegramChatId: z.string().nullable().optional(),
  logoUrl: z
    .union([z.string().max(800), z.literal(""), z.null()])
    .optional()
    .refine(
      (v) =>
        v === undefined ||
        v === null ||
        v === "" ||
        v.startsWith("/uploads/") ||
        /^https?:\/\//i.test(v),
      { message: "Logo URL yoki /uploads/... bo'lishi kerak" },
    ),
  coverImageUrl: z
    .union([z.string().max(800), z.literal(""), z.null()])
    .optional()
    .refine(
      (v) =>
        v === undefined ||
        v === null ||
        v === "" ||
        v.startsWith("/uploads/") ||
        /^https?:\/\//i.test(v),
      { message: "Cover URL yoki /uploads/... bo'lishi kerak" },
    ),
  tagline: z
    .union([z.string().max(160), z.literal(""), z.null()])
    .optional(),
  businessHours: z
    .object({
      monFri: z.string().max(40),
      sat: z.string().max(40),
      sun: z.string().max(40),
    })
    .nullable()
    .optional(),
  customDomain: z.string().nullable().optional(),
  /** Faqat label: feel-food → feel-food.{PLATFORM_ROOT_DOMAIN} */
  platformSubdomain: z.string().nullable().optional(),
  menuPrimaryColor: z.string().nullable().optional(),
  minOrderAmountSom: z.number().min(0).optional(),
  deliveryFeeSom: z.number().min(0).optional(),
  deliveryTimeMinutes: z.number().int().min(5).max(240).optional(),
  deliveryEnabled: z.boolean().optional(),
  dailyReportEnabled: z.boolean().optional(),
  dailyReportHour: z.number().int().min(0).max(23).optional(),
  telegramBotEnabled: z.boolean().optional(),
  waiterServiceFeePercent: z.number().int().min(0).max(100).optional(),
  paymeEnabled: z.boolean().optional(),
  paymeMerchantId: z.string().nullable().optional(),
  paymeKey: z.string().nullable().optional(),
  ofdEnabled: z.boolean().optional(),
  ofdTin: z.string().nullable().optional(),
  ofdCompanyName: z.string().nullable().optional(),
  ofdFmNumber: z.string().nullable().optional(),
});

function domainMeta(
  cafe: {
    slug: string;
    customDomain: string | null;
  },
  canUseDomain: boolean,
) {
  const root = getPlatformRootDomain();
  const suggested = root ? buildPlatformHost(cafe.slug, root) : null;
  let platformSubdomain: string | null = null;
  if (cafe.customDomain && root && cafe.customDomain.endsWith(`.${root}`)) {
    platformSubdomain = cafe.customDomain.slice(0, -(root.length + 1));
  }
  return {
    customDomainAllowed: canUseDomain,
    platformRootDomain: root || null,
    platformSubdomain,
    suggestedPlatformHost: suggested,
    publicAppPath: `/c/${cafe.slug}/app`,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  const { getConfiguredAppUrl } = await import("@/lib/app-url");
  const baseUrl = getConfiguredAppUrl();
  const botUsername = await getTelegramBotUsername();
  const planCtx = await getCafePlanContext(cafeId);
  const canUseDomain = !!planCtx?.config.features.customDomain;
  const telegramFeatureAllowed = !!planCtx?.config.features.telegram;
  const slug = cafe?.slug ?? "";
  const telegramBotEnabled = cafe?.telegramBotEnabled ?? true;
  const telegramWebAppUrl =
    telegramBotEnabled && slug && baseUrl.startsWith("https://")
      ? `${baseUrl}/c/${slug}/app?src=tg`
      : "";
  const telegramPwaUrl = slug && baseUrl ? `${baseUrl}/c/${slug}/app` : slug ? `/c/${slug}/app` : "";
  const telegramBotStartUrl =
    telegramBotEnabled && botUsername && slug
      ? `https://t.me/${botUsername}?start=cafe_${slug}`
      : "";

  return NextResponse.json({
    telegramChatId: cafe?.telegramChatId ?? null,
    telegramWebAppUrl,
    telegramPwaUrl,
    telegramBotStartUrl,
    telegramBotEnabled,
    telegramFeatureAllowed,
    planName: planCtx?.config.name ?? null,
    telegramBotUsername: botUsername,
    logoUrl: cafe?.logoUrl ?? null,
    coverImageUrl: cafe?.coverImageUrl ?? null,
    tagline: cafe?.tagline ?? null,
    businessHours: parseBusinessHours(cafe?.businessHours),
    customDomain: cafe?.customDomain ?? null,
    menuPrimaryColor: cafe?.menuPrimaryColor ?? "#d97706",
    minOrderAmountSom: Math.floor((cafe?.minOrderAmount ?? 0) / 100),
    deliveryFeeSom: Math.floor((cafe?.deliveryFee ?? 0) / 100),
    deliveryTimeMinutes: cafe?.deliveryTimeMinutes ?? 45,
    deliveryEnabled: cafe?.deliveryEnabled ?? true,
    dailyReportEnabled: cafe?.dailyReportEnabled ?? true,
    dailyReportHour: cafe?.dailyReportHour ?? 22,
    waiterServiceFeePercent: cafe?.waiterServiceFeePercent ?? 0,
    botConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
    paymeEnabled: cafe?.paymeEnabled ?? false,
    paymeMerchantId: cafe?.paymeMerchantId ?? "",
    paymeConfigured: !!(cafe?.paymeMerchantId && cafe?.paymeKey),
    paymeWebhookUrl: `${baseUrl}/api/payments/payme`,
    ofdEnabled: cafe?.ofdEnabled ?? false,
    ofdTin: cafe?.ofdTin ?? "",
    ofdCompanyName: cafe?.ofdCompanyName ?? "",
    ofdFmNumber: cafe?.ofdFmNumber ?? "",
    ...domainMeta(
      { slug: cafe?.slug ?? "", customDomain: cafe?.customDomain ?? null },
      canUseDomain,
    ),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  try {
    const { cafeId } = await params;
    const access = await requireCafeManager(cafeId);
    if (!access.ok) return access.response;

    const body = schema.parse(await request.json());
    let nextDomain: string | null | undefined = undefined;

    if (body.platformSubdomain !== undefined || body.customDomain !== undefined) {
      const gate = await checkPlanFeature(cafeId, "customDomain");
      if (!gate.ok) {
        return NextResponse.json({ error: gate.error }, { status: 403 });
      }

      if (body.platformSubdomain !== undefined) {
        const label = normalizeSubdomainLabel(body.platformSubdomain ?? "");
        if (!label) {
          nextDomain = null;
        } else if (isReservedSubdomain(label)) {
          return NextResponse.json(
            { error: "Bu subdomain band (tizim uchun)" },
            { status: 400 },
          );
        } else {
          const host = buildPlatformHost(label);
          if (!host) {
            return NextResponse.json(
              {
                error:
                  "Platforma domeni sozlanmagan (PLATFORM_ROOT_DOMAIN) yoki subdomain noto‘g‘ri",
              },
              { status: 400 },
            );
          }
          nextDomain = host;
        }
      } else if (body.customDomain !== undefined) {
        nextDomain = body.customDomain
          ? normalizeCustomHost(body.customDomain)
          : null;
      }

      if (nextDomain) {
        const taken = await prisma.cafe.findFirst({
          where: { customDomain: nextDomain, NOT: { id: cafeId } },
        });
        if (taken) {
          return NextResponse.json({ error: "Bu domen band" }, { status: 400 });
        }
      }
    }

    const existingMedia =
      body.logoUrl !== undefined || body.coverImageUrl !== undefined
        ? await prisma.cafe.findUnique({
            where: { id: cafeId },
            select: { logoUrl: true, coverImageUrl: true },
          })
        : null;

    const cafe = await prisma.cafe.update({
      where: { id: cafeId },
      data: {
        ...(body.telegramChatId !== undefined && {
          telegramChatId: body.telegramChatId || null,
        }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl || null }),
        ...(body.coverImageUrl !== undefined && {
          coverImageUrl: body.coverImageUrl || null,
        }),
        ...(body.tagline !== undefined && {
          tagline: body.tagline?.trim() || null,
        }),
        ...(body.businessHours !== undefined && {
          businessHours: body.businessHours
            ? JSON.stringify({
                monFri: body.businessHours.monFri.trim() || DEFAULT_BUSINESS_HOURS.monFri,
                sat: body.businessHours.sat.trim() || DEFAULT_BUSINESS_HOURS.sat,
                sun: body.businessHours.sun.trim() || DEFAULT_BUSINESS_HOURS.sun,
              })
            : null,
        }),
        ...(nextDomain !== undefined && { customDomain: nextDomain }),
        ...(body.menuPrimaryColor !== undefined && {
          menuPrimaryColor: body.menuPrimaryColor || null,
        }),
        ...(body.minOrderAmountSom !== undefined && {
          minOrderAmount: Math.round(body.minOrderAmountSom * 100),
        }),
        ...(body.deliveryFeeSom !== undefined && {
          deliveryFee: Math.round(body.deliveryFeeSom * 100),
        }),
        ...(body.deliveryTimeMinutes !== undefined && {
          deliveryTimeMinutes: body.deliveryTimeMinutes,
        }),
        ...(body.deliveryEnabled !== undefined && {
          deliveryEnabled: body.deliveryEnabled,
        }),
        ...(body.dailyReportEnabled !== undefined && {
          dailyReportEnabled: body.dailyReportEnabled,
        }),
        ...(body.dailyReportHour !== undefined && {
          dailyReportHour: body.dailyReportHour,
        }),
        ...(body.telegramBotEnabled !== undefined && {
          telegramBotEnabled: body.telegramBotEnabled,
        }),
        ...(body.waiterServiceFeePercent !== undefined && {
          waiterServiceFeePercent: body.waiterServiceFeePercent,
        }),
        ...(body.paymeEnabled !== undefined && { paymeEnabled: body.paymeEnabled }),
        ...(body.paymeMerchantId !== undefined && {
          paymeMerchantId: body.paymeMerchantId || null,
        }),
        ...(body.paymeKey !== undefined && { paymeKey: body.paymeKey || null }),
        ...(body.ofdEnabled !== undefined && { ofdEnabled: body.ofdEnabled }),
        ...(body.ofdTin !== undefined && { ofdTin: body.ofdTin || null }),
        ...(body.ofdCompanyName !== undefined && {
          ofdCompanyName: body.ofdCompanyName || null,
        }),
        ...(body.ofdFmNumber !== undefined && {
          ofdFmNumber: body.ofdFmNumber || null,
        }),
      },
    });

    if (body.logoUrl !== undefined) {
      await replaceLocalUpload(existingMedia?.logoUrl, body.logoUrl || null, cafeId);
    }
    if (body.coverImageUrl !== undefined) {
      await replaceLocalUpload(
        existingMedia?.coverImageUrl,
        body.coverImageUrl || null,
        cafeId,
      );
    }

    const planCtx = await getCafePlanContext(cafeId);

    return NextResponse.json({
      telegramChatId: cafe.telegramChatId,
      logoUrl: cafe.logoUrl,
      coverImageUrl: cafe.coverImageUrl,
      tagline: cafe.tagline,
      businessHours: parseBusinessHours(cafe.businessHours),
      customDomain: cafe.customDomain,
      menuPrimaryColor: cafe.menuPrimaryColor,
      minOrderAmountSom: Math.floor(cafe.minOrderAmount / 100),
      deliveryFeeSom: Math.floor(cafe.deliveryFee / 100),
      deliveryTimeMinutes: cafe.deliveryTimeMinutes,
      deliveryEnabled: cafe.deliveryEnabled,
      dailyReportEnabled: cafe.dailyReportEnabled,
      dailyReportHour: cafe.dailyReportHour,
      telegramBotEnabled: cafe.telegramBotEnabled,
      waiterServiceFeePercent: cafe.waiterServiceFeePercent,
      ...domainMeta(
        { slug: cafe.slug, customDomain: cafe.customDomain },
        !!planCtx?.config.features.customDomain,
      ),
    });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const { cafeId } = await params;
  const access = await requireCafeManager(cafeId);
  if (!access.ok) return access.response;

  const action = new URL(request.url).searchParams.get("action");
  if (action === "test-report") {
    const period =
      new URL(request.url).searchParams.get("period") === "week" ? "week" : "day";
    const result = await sendDailyReportsForCafe(cafeId, period);
    if (!result.sent) {
      return NextResponse.json(
        { error: "Telegram yuborilmadi — chat ID va bot tokenni tekshiring" },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Noto'g'ri action" }, { status: 400 });
}

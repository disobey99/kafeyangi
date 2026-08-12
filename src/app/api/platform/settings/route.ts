import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getPlatformSettings,
  savePlatformSettings,
} from "@/lib/platform-settings";
import { requirePlatformApiPermission } from "@/lib/session-guard";

const socialField = z.string().max(200).optional();

const planDiscountSchema = z.object({
  enabled: z.boolean().optional(),
  percent: z.number().min(0).max(90).optional(),
  validFrom: z.string().max(12).optional(),
  validTo: z.string().max(12).optional(),
});

const patchSchema = z.object({
  companyName: z.string().min(1).max(120).optional(),
  contactEmail: z.string().email().max(120).optional(),
  contactPhone: z.string().max(40).optional(),
  socialInstagram: socialField,
  socialTelegram: socialField,
  socialFacebook: socialField,
  notifyNewCustomer: z.boolean().optional(),
  notifyPaymentOverdue: z.boolean().optional(),
  notifyWeeklyReport: z.boolean().optional(),
  supportPhone: z.string().max(40).optional(),
  supportTelegram: socialField,
  supportInstagram: socialField,
  supportTitle: z.string().max(80).optional(),
  planCurrency: z.enum(["USD", "UZS"]).optional(),
  planPrices: z
    .object({
      STARTER: z.number().int().min(1).optional(),
      STANDARD: z.number().int().min(1).optional(),
      PRO: z.number().int().min(1).optional(),
    })
    .optional(),
  planDiscounts: z
    .object({
      STARTER: planDiscountSchema.optional(),
      STANDARD: planDiscountSchema.optional(),
      PRO: planDiscountSchema.optional(),
    })
    .optional(),
});

export async function GET() {
  const access = await requirePlatformApiPermission("menu.settings");
  if (!access.ok) return access.response;

  return NextResponse.json({ settings: getPlatformSettings() });
}

export async function PATCH(request: NextRequest) {
  const access = await requirePlatformApiPermission("action.settings.edit");
  if (!access.ok) return access.response

  try {
    const body = patchSchema.parse(await request.json());
    const settings = savePlatformSettings(body as Parameters<typeof savePlatformSettings>[0]);
    revalidatePath("/platform", "layout");
    revalidatePath("/");
    revalidatePath("/platform/settings");
    revalidatePath("/dashboard", "layout");
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("platform settings patch:", error);
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri"
        : "Ma'lumotlar noto'g'ri";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createTelegramPasswordResetLink } from "@/lib/password-reset";
import {
  checkRateLimit,
  clientIpFromHeaders,
  rateLimitResponse,
} from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromHeaders(request.headers);
    const ipLimit = checkRateLimit({
      key: `forgot-tg:ip:${ip}`,
      limit: 15,
      windowMs: 15 * 60 * 1000,
    });
    if (!ipLimit.ok) {
      return rateLimitResponse(ipLimit.retryAfterSec);
    }

    const body = schema.parse(await request.json());
    const emailKey = body.email.trim().toLowerCase();
    const emailLimit = checkRateLimit({
      key: `forgot-tg:email:${emailKey}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!emailLimit.ok) {
      return rateLimitResponse(emailLimit.retryAfterSec);
    }

    const result = await createTelegramPasswordResetLink(body.email);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      message: result.message,
      telegramUrl: result.telegramUrl,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Email noto'g'ri" }, { status: 400 });
    }
    console.error("[forgot-password/telegram]", err);
    return NextResponse.json({ error: "Xatolik yuz berdi" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/password-reset";
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
      key: `forgot:ip:${ip}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!ipLimit.ok) {
      return rateLimitResponse(
        ipLimit.retryAfterSec,
        `Juda ko‘p so‘rov. ${ipLimit.retryAfterSec} soniyadan keyin qayta urinib ko‘ring.`,
      );
    }

    const body = schema.parse(await request.json());
    const emailKey = body.email.trim().toLowerCase();
    const emailLimit = checkRateLimit({
      key: `forgot:email:${emailKey}`,
      limit: 6,
      windowMs: 15 * 60 * 1000,
    });
    if (!emailLimit.ok) {
      return rateLimitResponse(
        emailLimit.retryAfterSec,
        `Bu email uchun hozircha kutish kerak (${emailLimit.retryAfterSec} s).`,
      );
    }

    const result = await requestPasswordReset(body.email);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          locked: "locked" in result ? result.locked : false,
          support: "support" in result ? result.support : undefined,
          retryAfterSec: "retryAfterSec" in result ? result.retryAfterSec : undefined,
          sendsLeft: "sendsLeft" in result ? result.sendsLeft : undefined,
        },
        {
          status: result.status,
          headers:
            "retryAfterSec" in result && result.retryAfterSec
              ? { "Retry-After": String(result.retryAfterSec) }
              : undefined,
        },
      );
    }
    return NextResponse.json({
      ok: true,
      message: result.message,
      emailSent: result.emailSent,
      sendsLeft: result.sendsLeft,
      support: result.support,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Email noto'g'ri" }, { status: 400 });
    }
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Xatolik yuz berdi" }, { status: 500 });
  }
}

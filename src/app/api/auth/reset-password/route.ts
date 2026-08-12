import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resetPasswordWithCode } from "@/lib/password-reset";
import {
  checkRateLimit,
  clientIpFromHeaders,
  rateLimitResponse,
} from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(12),
  newPassword: z.string().min(6).max(120),
});

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromHeaders(request.headers);
    const ipLimit = checkRateLimit({
      key: `reset:ip:${ip}`,
      limit: 15,
      windowMs: 15 * 60 * 1000,
    });
    if (!ipLimit.ok) {
      return rateLimitResponse(ipLimit.retryAfterSec);
    }

    const body = schema.parse(await request.json());
    const emailKey = body.email.trim().toLowerCase();
    const emailLimit = checkRateLimit({
      key: `reset:email:${emailKey}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!emailLimit.ok) {
      return rateLimitResponse(emailLimit.retryAfterSec);
    }

    const result = await resetPasswordWithCode(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, message: result.message });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
    }
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Xatolik yuz berdi" }, { status: 500 });
  }
}

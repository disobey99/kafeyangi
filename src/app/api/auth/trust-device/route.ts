import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  attachSessionCookie,
  createSessionToken,
  getSession,
} from "@/lib/auth";
import { parseDeviceLabel, trustDevice } from "@/lib/device-login";

const schema = z.object({
  deviceId: z.string().min(8).max(80),
  deviceLabel: z.string().max(120).optional(),
});

/** Allaqachon kirgan qurilmani ishonchli deb belgilash + JWT ga deviceId yozish */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Kirish kerak" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    const ua = request.headers.get("user-agent");
    const label = body.deviceLabel?.trim() || parseDeviceLabel(ua);

    await trustDevice({
      userId: session.userId,
      deviceId: body.deviceId,
      deviceLabel: label,
      userAgent: ua,
    });

    const res = NextResponse.json({ ok: true, deviceLabel: label });

    // Sessiyaga deviceId bog'lash — keyin chiqarib yuborish ishlashi uchun
    if (session.deviceId !== body.deviceId) {
      const token = await createSessionToken({
        userId: session.userId,
        email: session.email,
        name: session.name,
        globalRole: session.globalRole,
        deviceId: body.deviceId,
      });
      attachSessionCookie(res, token);
    }

    return res;
  } catch (error) {
    console.error("trust-device:", error);
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

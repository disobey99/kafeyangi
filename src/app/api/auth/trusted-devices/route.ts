import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  listTrustedDevices,
  revokeAllTrustedDevices,
  revokeTrustedDevice,
} from "@/lib/device-login";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Kirish kerak" }, { status: 401 });
  }

  const devices = await listTrustedDevices(session.userId);
  return NextResponse.json({ devices });
}

const deleteSchema = z.object({
  deviceId: z.string().optional(),
  all: z.boolean().optional(),
  keepCurrent: z.boolean().optional(),
  currentDeviceId: z.string().min(8).max(80).optional(),
});

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Kirish kerak" }, { status: 401 });
  }

  try {
    const body = deleteSchema.parse(await request.json().catch(() => ({})));

    if (body.all) {
      const keep =
        body.keepCurrent !== false ? body.currentDeviceId : undefined;
      await revokeAllTrustedDevices(session.userId, keep);
      return NextResponse.json({ ok: true });
    }

    if (!body.deviceId) {
      return NextResponse.json({ error: "deviceId kerak" }, { status: 400 });
    }

    const result = await revokeTrustedDevice(session.userId, body.deviceId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listPendingApprovals } from "@/lib/device-login";

/** Mavjud qurilma — kutilayotgan kirish so'rovlari */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Kirish kerak" }, { status: 401 });
  }

  const rows = await listPendingApprovals(session.userId);
  return NextResponse.json({
    requests: rows.map((r) => ({
      id: r.id,
      deviceLabel: r.deviceLabel,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
    })),
  });
}

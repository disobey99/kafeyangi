import { NextResponse } from "next/server";
import { getApprovalStatus } from "@/lib/device-login";

/** Yangi qurilma — tasdiq holatini kuzatish (auth shart emas) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await params;
  const row = await getApprovalStatus(requestId);
  if (!row) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    status: row.status,
    deviceLabel: row.deviceLabel,
    expiresAt: row.expiresAt.toISOString(),
    approvalToken: row.status === "APPROVED" ? row.approvalToken : null,
  });
}

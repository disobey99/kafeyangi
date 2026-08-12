import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { approveLoginRequest, rejectLoginRequest } from "@/lib/device-login";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Kirish kerak" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { action } = schema.parse(await request.json());

    if (action === "approve") {
      const result = await approveLoginRequest(session.userId, id);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, status: "APPROVED" });
    }

    const result = await rejectLoginRequest(session.userId, id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, status: "REJECTED" });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

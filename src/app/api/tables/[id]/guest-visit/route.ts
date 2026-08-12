import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveTableGuestVisit } from "@/lib/table-guest-visit";

const schema = z.object({
  token: z.string().min(1),
  visitToken: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = schema.parse(await request.json());
    const result = await resolveTableGuestVisit(id, body.token, body.visitToken);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({
      visitToken: result.visitToken,
      orderingAllowed: result.orderingAllowed,
      sessionClosed: result.sessionClosed,
      tableBusy: result.tableBusy,
      idleTimeoutMs: result.idleTimeoutMs,
    });
  } catch (error) {
    console.error("POST guest-visit:", error);
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

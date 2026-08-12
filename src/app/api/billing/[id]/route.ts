import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { payInvoice } from "@/lib/billing";
import { requirePlatformApiPermission } from "@/lib/session-guard";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requirePlatformApiPermission("action.payments.manage");
  if (!access.ok) return access.response;

  const { id } = await params;
  const body = z.object({ action: z.literal("pay") }).parse(await request.json());

  if (body.action === "pay") {
    const result = await payInvoice(id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 });
}

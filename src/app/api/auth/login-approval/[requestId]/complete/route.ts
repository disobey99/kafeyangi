import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { attachSessionCookie, createSessionToken } from "@/lib/auth";
import { consumeApprovalToken } from "@/lib/device-login";
import { getLoginRedirect } from "@/lib/staff-redirect";

const schema = z.object({
  approvalToken: z.string().min(10),
});

/** Tasdiqlangan so'rov — sessiya ochish */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;
    const body = schema.parse(await request.json());
    const result = await consumeApprovalToken(requestId, body.approvalToken);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { user, deviceId } = result;
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      globalRole: user.globalRole,
      deviceId,
    });
    const redirectTo = await getLoginRedirect(user.id, user.globalRole);

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole,
      },
      redirectTo,
    });
    attachSessionCookie(res, token);
    return res;
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 400 });
  }
}

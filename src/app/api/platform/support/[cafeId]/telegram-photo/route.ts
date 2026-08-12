import { NextResponse } from "next/server";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import { openAdminPhotoRelaySlot } from "@/lib/telegram-support-bot";

/** Platformada rasm yo'q — admin Telegramiga reply-slot ochadi */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const access = await requirePlatformApiPermission("action.support.reply");
  if (!access.ok) return access.response;

  const { cafeId } = await params;
  const result = await openAdminPhotoRelaySlot(cafeId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    telegramUrl: result.telegramUrl,
    message: "Telegram ochildi — shu yerga rasm yuboring (Reply shart emas).",
  });
}

import { NextResponse } from "next/server";
import { requirePlatformApiPermission } from "@/lib/session-guard";

/** Telegram orqali rasm yuborish o‘chirilgan */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ cafeId: string }> },
) {
  const access = await requirePlatformApiPermission("action.support.reply");
  if (!access.ok) return access.response;

  await params;
  return NextResponse.json(
    {
      error:
        "Telegram orqali rasm yuborish o‘chirilgan. Matnli support — sayt orqali.",
    },
    { status: 410 },
  );
}

import { NextResponse } from "next/server";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import { getPlatformSupportUnreadTotal } from "@/lib/support-chat";

export async function GET() {
  const access = await requirePlatformApiPermission("menu.support");
  if (!access.ok) return access.response;
  const unread = await getPlatformSupportUnreadTotal();
  return NextResponse.json({ unread });
}

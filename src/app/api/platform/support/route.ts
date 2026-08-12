import { NextResponse } from "next/server";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import { listPlatformSupportInbox } from "@/lib/support-chat";

export async function GET() {
  const access = await requirePlatformApiPermission("menu.support");
  if (!access.ok) return access.response;
  const rows = await listPlatformSupportInbox();
  return NextResponse.json({
    conversations: rows.map((r) => ({
      cafeId: r.cafeId,
      cafeName: r.cafeName,
      conversationId: r.conversationId,
      lastMessage: r.lastMessage ?? "",
      lastAt: new Date(r.lastAt).toISOString(),
      unreadCount: Number(r.unreadCount ?? 0),
    })),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  listNotifications,
  markNotificationsRead,
  unreadNotificationCount,
} from "@/lib/app-notifications";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Kirish kerak" }, { status: 401 });
  }

  const cafeId = request.nextUrl.searchParams.get("cafeId") ?? undefined;
  const notifications = await listNotifications(session.userId, cafeId);
  const unread = await unreadNotificationCount(session.userId, cafeId);

  return NextResponse.json({ notifications, unread });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Kirish kerak" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { ids?: string[] };
  await markNotificationsRead(session.userId, body.ids);
  return NextResponse.json({ ok: true });
}

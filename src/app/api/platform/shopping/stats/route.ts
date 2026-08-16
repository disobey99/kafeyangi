import { NextResponse } from "next/server";
import { requirePlatformApiPermission } from "@/lib/session-guard";
import { getShopStats } from "@/lib/shop-admin";

export async function GET() {
  const access = await requirePlatformApiPermission("menu.shopping");
  if (!access.ok) return access.response;
  try {
    const stats = await getShopStats();
    return NextResponse.json(stats);
  } catch (e) {
    console.error("[shopping/stats]", e);
    return NextResponse.json({ error: "Statistika olinmadi" }, { status: 500 });
  }
}

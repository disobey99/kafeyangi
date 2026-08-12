import { NextResponse } from "next/server";
import { getSession, isSuperAdmin } from "@/lib/auth";
import { getPlatformStats } from "@/lib/platform-stats";

export async function GET() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  try {
    const stats = await getPlatformStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("platform stats:", error);
    return NextResponse.json({ error: "Xatolik" }, { status: 500 });
  }
}

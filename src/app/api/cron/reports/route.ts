import { NextRequest, NextResponse } from "next/server";
import { runScheduledDailyReports } from "@/lib/daily-report";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET sozlanmagan" }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const results = await runScheduledDailyReports();
  return NextResponse.json({ ok: true, ...results });
}

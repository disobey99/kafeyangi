import { NextResponse } from "next/server";
import { clearSessionCookieOnResponse } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookieOnResponse(res);
  return res;
}

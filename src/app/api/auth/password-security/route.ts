import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPasswordSecurityAdvice } from "@/lib/password-security";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const advice = await getPasswordSecurityAdvice(session.userId);
  return NextResponse.json(advice);
}

import { NextResponse } from "next/server";
import { getPublicSupportContacts } from "@/lib/platform-settings";

export async function GET() {
  return NextResponse.json({ support: getPublicSupportContacts() });
}

import { NextResponse } from "next/server";

/** Telegram orqali parol tiklash o‘chirilgan — faqat email */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Telegram orqali parol tiklash o‘chirilgan. Faqat email orqali kod oling yoki supportga murojaat qiling.",
    },
    { status: 410 },
  );
}

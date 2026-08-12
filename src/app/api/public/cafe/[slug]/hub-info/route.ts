import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLoyaltyProgramConfig } from "@/lib/loyalty";
import { getTelegramBotUsername } from "@/lib/telegram";

type CafeSocial = {
  instagram: string | null;
  telegram: string | null;
  facebook: string | null;
};

async function getCafeSocial(cafeId: string): Promise<CafeSocial> {
  const empty: CafeSocial = { instagram: null, telegram: null, facebook: null };
  try {
    const row = await prisma.cafe.findUnique({
      where: { id: cafeId },
      select: {
        socialInstagram: true,
        socialTelegram: true,
        socialFacebook: true,
      },
    });
    if (!row) return empty;
    return {
      instagram: row.socialInstagram,
      telegram: row.socialTelegram,
      facebook: row.socialFacebook,
    };
  } catch {
    try {
      const rows = await prisma.$queryRaw<
        Array<{
          socialInstagram: string | null;
          socialTelegram: string | null;
          socialFacebook: string | null;
        }>
      >`
        SELECT socialInstagram, socialTelegram, socialFacebook
        FROM Cafe WHERE id = ${cafeId} LIMIT 1
      `;
      const row = rows[0];
      if (!row) return empty;
      return {
        instagram: row.socialInstagram,
        telegram: row.socialTelegram,
        facebook: row.socialFacebook,
      };
    } catch {
      return empty;
    }
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const cafe = await prisma.cafe.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      menuPrimaryColor: true,
      telegramBotEnabled: true,
      status: true,
    },
  });

  if (!cafe) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  const [program, social, botUsername] = await Promise.all([
    getLoyaltyProgramConfig(cafe.id),
    getCafeSocial(cafe.id),
    getTelegramBotUsername(),
  ]);

  const botOpen =
    cafe.telegramBotEnabled !== false &&
    cafe.status !== "SUSPENDED" &&
    cafe.status !== "CANCELLED";

  return NextResponse.json({
    cafeId: cafe.id,
    cafeName: cafe.name,
    logoUrl: cafe.logoUrl,
    menuPrimaryColor: cafe.menuPrimaryColor ?? "#d97706",
    loyalty: program,
    social,
    telegramBotUsername: botOpen ? botUsername : null,
    telegramBotDeepLink:
      botOpen && botUsername
        ? `https://t.me/${botUsername}?start=cafe_${slug}`
        : null,
  });
}

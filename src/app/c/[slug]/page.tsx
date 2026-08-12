import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Inter } from "next/font/google";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CafeBrandLanding } from "@/components/cafe-brand-landing";
import { renderCustomerCafeBlockedIfNeeded } from "@/lib/customer-cafe-gate";
import { getGroupBranches } from "@/lib/branches";
import { parseBusinessHours } from "@/lib/cafe-business-hours";
import { getCafePlanContext } from "@/lib/plan-access";
import { getCafeBotStartLink } from "@/lib/telegram-customer-bot";

const cafeDisplay = Archivo({
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
  variable: "--font-cafe-display",
});

const cafeSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cafe-sans",
});

const cafeMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cafe-mono",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cafe = await prisma.cafe.findUnique({
    where: { slug },
    select: {
      name: true,
      logoUrl: true,
      tagline: true,
      address: true,
      menuPrimaryColor: true,
    },
  });
  const name = cafe?.name ?? "Kafe";
  const description =
    cafe?.tagline?.trim() ||
    cafe?.address?.trim() ||
    `${name} — onlayn buyurtma va ilova`;
  return {
    title: name,
    description,
    manifest: `/c/${slug}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: name,
    },
    icons: cafe?.logoUrl ? [{ url: cafe.logoUrl }] : [{ url: "/icons/icon.svg" }],
  };
}

export default async function CustomerMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const cafeMeta = await prisma.cafe.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      status: true,
      suspendReason: true,
      logoUrl: true,
      menuPrimaryColor: true,
      subscriptionEndsAt: true,
      trialEndsAt: true,
    },
  });

  if (!cafeMeta) notFound();

  const blockedScreen = await renderCustomerCafeBlockedIfNeeded(slug, cafeMeta);
  if (blockedScreen) return blockedScreen;

  const cafe = await prisma.cafe.findUnique({
    where: { slug },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          products: {
            where: { isAvailable: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!cafe) notFound();

  const planCtx = await getCafePlanContext(cafe.id);
  const showTelegramBot =
    !!planCtx?.config.features.telegram &&
    !!planCtx?.config.features.onlineOrders &&
    cafe.telegramBotEnabled !== false &&
    cafe.status !== "SUSPENDED" &&
    cafe.status !== "CANCELLED";
  const telegramBotUrl = showTelegramBot
    ? await getCafeBotStartLink(cafe.slug)
    : null;

  const { branches: groupCafes, group } = await getGroupBranches(cafe.id);
  const branches = groupCafes
    .filter((b) => b.status !== "CANCELLED" && b.slug !== cafe.slug)
    .map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      address: b.address,
      isMainBranch: b.isMainBranch,
    }));

  return (
    <div
      className={`${cafeDisplay.variable} ${cafeSans.variable} ${cafeMono.variable}`}
    >
      <CafeBrandLanding
        slug={slug}
        cafeName={cafe.name}
        address={cafe.address}
        phone={cafe.phone}
        logoUrl={cafe.logoUrl}
        coverImageUrl={cafe.coverImageUrl}
        tagline={cafe.tagline}
        businessHours={parseBusinessHours(cafe.businessHours)}
        branches={branches}
        groupName={group?.name ?? null}
        social={{
          instagram: cafe.socialInstagram,
          telegram: cafe.socialTelegram,
          facebook: cafe.socialFacebook,
        }}
        menuPrimaryColor={cafe.menuPrimaryColor}
        telegramBotUrl={telegramBotUrl}
        categories={cafe.categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          nameRu: cat.nameRu,
          nameEn: cat.nameEn,
          products: cat.products.map((p) => ({
            id: p.id,
            name: p.name,
            nameRu: p.nameRu,
            nameEn: p.nameEn,
            description: p.description,
            descriptionRu: p.descriptionRu,
            descriptionEn: p.descriptionEn,
            price: p.price,
            discountPrice: p.discountPrice,
            imageUrl: p.imageUrl,
            menuTag: p.menuTag,
          })),
        }))}
      />
    </div>
  );
}

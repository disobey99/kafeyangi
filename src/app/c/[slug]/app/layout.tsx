import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cafe = await prisma.cafe.findUnique({
    where: { slug },
    select: { name: true, menuPrimaryColor: true, logoUrl: true },
  });
  const name = cafe?.name ?? "Kafe";
  const theme = cafe?.menuPrimaryColor ?? "#0d9488";

  return {
    title: `${name} — Onlayn buyurtma`,
    description: `${name} dan yetkazib berish va olib ketish`,
    manifest: `/c/${slug}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: name,
    },
    icons: cafe?.logoUrl
      ? [{ url: cafe.logoUrl }]
      : [{ url: "/icons/icon.svg" }],
    other: {
      "theme-color": theme,
    },
  };
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Viewport> {
  return {
    themeColor: "#2AC1BC",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  };
}

export default function DeliveryAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}

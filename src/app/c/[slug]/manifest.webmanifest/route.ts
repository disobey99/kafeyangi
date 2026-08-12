import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const cafe = await prisma.cafe.findUnique({
    where: { slug },
    select: {
      name: true,
      menuPrimaryColor: true,
      logoUrl: true,
    },
  });

  if (!cafe) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const theme = "#2AC1BC";
  const icon = cafe.logoUrl || "/icons/icon.svg";

  const manifest = {
    id: `/c/${slug}/app`,
    name: `${cafe.name} — Onlayn`,
    short_name: cafe.name.slice(0, 12),
    description: `${cafe.name} yetkazib berish va olib ketish`,
    start_url: `/c/${slug}/app`,
    scope: `/c/${slug}/`,
    display: "standalone",
    background_color: "#F5F5F5",
    theme_color: theme,
    lang: "uz",
    orientation: "portrait-primary",
    icons: [
      {
        src: icon,
        sizes: "any",
        type: icon.endsWith(".svg") ? "image/svg+xml" : "image/png",
        purpose: "any",
      },
      {
        src: icon,
        sizes: "512x512",
        type: icon.endsWith(".svg") ? "image/svg+xml" : "image/png",
        purpose: "maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

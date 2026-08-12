import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectivePlanConfig } from "@/lib/plans";
import {
  getPlatformRootDomain,
  normalizeCustomHost,
  parsePlatformSubdomain,
} from "@/lib/platform-domain";

async function cafeHasCustomDomain(cafe: {
  id: string;
  plan: "STARTER" | "STANDARD" | "PRO";
  status: string;
}): Promise<boolean> {
  const config = getEffectivePlanConfig(cafe.plan, cafe.status);
  return config.features.customDomain;
}

export async function GET(request: Request) {
  const hostRaw = new URL(request.url).searchParams.get("host");
  if (!hostRaw) {
    return NextResponse.json({ slug: null });
  }

  const host = normalizeCustomHost(hostRaw);
  const root = getPlatformRootDomain();

  // 1) To'liq customDomain / saqlangan platform host
  const byDomain = await prisma.cafe.findFirst({
    where: { customDomain: host },
    select: { id: true, slug: true, plan: true, status: true },
  });
  if (byDomain && (await cafeHasCustomDomain(byDomain))) {
    return NextResponse.json({ slug: byDomain.slug });
  }

  // 2) Pro: {slug}.{PLATFORM_ROOT_DOMAIN} — alohida sozlash shart emas
  const sub = parsePlatformSubdomain(host, root);
  if (sub) {
    const bySlug = await prisma.cafe.findUnique({
      where: { slug: sub },
      select: { id: true, slug: true, plan: true, status: true },
    });
    if (bySlug && (await cafeHasCustomDomain(bySlug))) {
      return NextResponse.json({ slug: bySlug.slug });
    }
  }

  return NextResponse.json({ slug: null });
}

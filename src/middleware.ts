import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** LAN / lokal — custom domain bo'lmaydi, middleware kerak emas */
const LOCAL_HOST =
  /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/;

const domainCache = new Map<string, { slug: string | null; at: number }>();
const CACHE_MS = 5 * 60 * 1000;

async function resolveSlug(host: string, origin: string): Promise<string | null> {
  const hit = domainCache.get(host);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.slug;

  try {
    const resolveUrl = new URL("/api/public/resolve-domain", origin);
    resolveUrl.searchParams.set("host", host);
    const res = await fetch(resolveUrl.toString(), { cache: "no-store" });
    const data = (await res.json()) as { slug: string | null };
    const slug = data.slug ?? null;
    domainCache.set(host, { slug, at: Date.now() });
    return slug;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (!host || LOCAL_HOST.test(host)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Staff / admin — custom domain redirect kerak emas
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/kitchen") ||
    pathname.startsWith("/cashier") ||
    pathname.startsWith("/display") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/platform") ||
    pathname.startsWith("/tg")
  ) {
    return NextResponse.next();
  }

  const slug = await resolveSlug(host, request.url);
  if (!slug) return NextResponse.next();

  // Subdomen / — kafe sayti (meny + yuklab olish), to‘g‘ridan /app emas
  if (pathname === "/" || pathname === "") {
    return NextResponse.redirect(new URL(`/c/${slug}`, request.url));
  }

  if (pathname.startsWith("/c/")) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(`/c/${slug}${pathname}`, request.url));
}

export const config = {
  matcher: [
    /*
     * /api va statik fayllar middleware dan o'tmasin — har API chaqiruvda sekinlashmasin
     */
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|sw.js).*)",
  ],
};

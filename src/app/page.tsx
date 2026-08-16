import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  Building2,
  ChefHat,
  Mail,
  Phone,
  QrCode,
  Smartphone,
  Volume2,
  WifiOff,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  getPlatformSettings,
  getPlatformSocialLinks,
} from "@/lib/platform-settings";
import { ThemeToggle } from "@/components/theme-toggle";
import { PricingSection } from "@/components/pricing-section";
import { PlatformSocialIcons } from "@/components/platform-social-icons";
import { NooklineMark } from "@/components/nookline-mark";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_TITLE,
  getSeoSiteUrl,
} from "@/lib/site-seo";

const siteUrl = getSeoSiteUrl();

export const metadata: Metadata = {
  title: {
    absolute: SITE_TITLE,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: siteUrl,
    siteName: SITE_NAME,
    images: [{ url: SITE_OG_IMAGE, alt: SITE_NAME }],
  },
};

const features = [
  {
    icon: QrCode,
    title: "QR menyu",
    desc: "Mijoz stoldan telefon orqali buyurtma. Ofitsiant chaqirish va holat kuzatuvi.",
    color: "from-teal-500/20 to-cyan-500/10",
  },
  {
    icon: Volume2,
    title: "Ovozli kassa",
    desc: "Yangi buyurtma — darhol signal va ovozli e'lon. Real vaqt sinxron.",
    color: "from-emerald-500/20 to-green-500/10",
  },
  {
    icon: ChefHat,
    title: "Oshxona ekrani",
    desc: "Buyurtmalar oshxonada. Tayyor bo'lganda TV ekranda raqam chiqadi.",
    color: "from-orange-500/20 to-red-500/10",
  },
  {
    icon: BarChart3,
    title: "Telegram hisobot",
    desc: "Kunlik va haftalik savdo xulosasi avtomatik Telegramga.",
    color: "from-blue-500/20 to-indigo-500/10",
  },
  {
    icon: Smartphone,
    title: "Sodiqlik kartasi",
    desc: "Telefon raqam bo'yicha bonus ball — mijozlar qaytib keladi.",
    color: "from-pink-500/20 to-rose-500/10",
  },
  {
    icon: QrCode,
    title: "3 tilda menyu",
    desc: "O'zbek, rus va ingliz tillarida menyu va PDF QR stollar.",
    color: "from-cyan-500/20 to-sky-500/10",
  },
  {
    icon: Building2,
    title: "Ko'p filial",
    desc: "Bir tarmoq ostida bir nechta kafe. Filial almashtirish bir bosishda.",
    color: "from-violet-500/20 to-purple-500/10",
  },
  {
    icon: WifiOff,
    title: "Offline rejim",
    desc: "Internet uzilsa ham kassa ishlaydi. Ulanish qaytganida sinxronlanadi.",
    color: "from-stone-500/20 to-stone-400/10",
  },
];

function phoneTelHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : undefined;
}

export default async function HomePage() {
  const session = await getSession();
  const platform = getPlatformSettings();
  const socialLinks = getPlatformSocialLinks(platform);
  const phoneHref = phoneTelHref(platform.contactPhone);

  return (
    <div className="min-h-full">
      <header className="glass sticky top-0 z-50 border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <NooklineMark size={36} />
            <span className="truncate text-lg font-extrabold tracking-tight">
              {platform.companyName}
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[var(--muted)] lg:flex">
            <a href="#features" className="transition hover:text-[var(--brand)]">
              Imkoniyatlar
            </a>
            <a href="#pricing" className="transition hover:text-[var(--brand)]">
              Tariflar
            </a>
            <Link href="/c/demo-kafe" className="transition hover:text-[var(--brand)]">
              Demo
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            {platform.contactPhone && phoneHref && (
              <a
                href={phoneHref}
                className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-semibold text-[var(--brand)] shadow-sm transition hover:border-[var(--brand)]/40 hover:bg-[var(--brand)]/10 md:inline-flex"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand)]/15">
                  <Phone className="h-3.5 w-3.5" strokeWidth={2.25} />
                </span>
                <span className="tabular-nums tracking-wide">{platform.contactPhone}</span>
              </a>
            )}
            <div className="hidden sm:block">
              <PlatformSocialIcons links={socialLinks} size="sm" />
            </div>
            <ThemeToggle className="hidden sm:flex" />
            {session ? (
              <Link href={session.globalRole === "SUPER_ADMIN" ? "/platform" : "/dashboard"} className="btn btn-primary">
                Panel
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">
                  Kirish
                </Link>
                <Link href="/register" className="btn btn-primary">
                  Boshlash
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="hero-bg relative overflow-hidden px-6 pb-24 pt-20 md:pt-28">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[var(--brand)] opacity-[0.07] blur-3xl" />
            <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[var(--brand)] opacity-[0.05] blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="text-2xl font-extrabold tracking-tight text-[var(--brand)] md:text-3xl">
              {platform.companyName}
            </p>
            <h1 className="mt-4 text-5xl font-extrabold leading-[1.08] tracking-tight md:text-7xl">
              Kafeingizni{" "}
              <span className="text-gradient">zamonaviy</span>
              <br />
              boshqaring
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--muted)] md:text-xl">
              QR menyu, ovozli kassa, oshxona ekrani, hisobotlar va ko&apos;p filial —
              professional tizim bir joyda.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn btn-primary px-8 py-3.5 text-base">
                14 kun bepul sinov
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/c/demo-kafe" className="btn btn-secondary px-8 py-3.5 text-base">
                <Smartphone className="h-5 w-5" />
                Demo menyu
              </Link>
            </div>
          </div>

          <div className="relative mx-auto mt-20 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", t: "Ro'yxatdan o'ting", d: "14 kun bepul" },
              { n: "02", t: "Menyuni to'ldiring", d: "Taomlar va narxlar" },
              { n: "03", t: "QR chop eting", d: "Stollarga qo'ying" },
              { n: "04", t: "Buyurtma qabul qiling", d: "Kassa tayyor" },
            ].map((s) => (
              <div key={s.n} className="card group p-6 text-left">
                <span className="text-xs font-bold tracking-widest text-[var(--brand)] opacity-60">
                  {s.n}
                </span>
                <p className="mt-3 font-bold">{s.t}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                Barcha kerakli funksiyalar
              </h2>
              <p className="mt-3 text-[var(--muted)]">
                Kichik choyxonadan katta restoranga qadar
              </p>
            </div>
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="card card-hover group p-7">
                  <div
                    className={`icon-box icon-box-xl bg-gradient-to-br ${f.color} transition group-hover:scale-105`}
                  >
                    <f.icon className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PricingSection />
      </main>

      <footer className="border-t border-[var(--border)] px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <NooklineMark size={40} />
                <div>
                  <p className="text-lg font-extrabold tracking-tight">
                    {platform.companyName}
                  </p>
                  <p className="text-xs text-[var(--muted)]">Kafe boshqaruv platformasi</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {platform.contactPhone && phoneHref && (
                  <a
                    href={phoneHref}
                    className="inline-flex items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 transition hover:border-[var(--brand)]/40 hover:bg-[var(--brand)]/10"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)]/15 text-[var(--brand)]">
                      <Phone className="h-4 w-4" strokeWidth={2.25} />
                    </span>
                    <span>
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                        Telefon
                      </span>
                      <span className="text-sm font-bold tabular-nums tracking-wide">
                        {platform.contactPhone}
                      </span>
                    </span>
                  </a>
                )}
                {platform.contactEmail && (
                  <a
                    href={`mailto:${platform.contactEmail}`}
                    className="inline-flex items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 transition hover:border-[var(--brand)]/40 hover:bg-[var(--brand)]/10"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)]/15 text-[var(--brand)]">
                      <Mail className="h-4 w-4" strokeWidth={2.25} />
                    </span>
                    <span>
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                        Email
                      </span>
                      <span className="text-sm font-bold">{platform.contactEmail}</span>
                    </span>
                  </a>
                )}
              </div>
              {socialLinks.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Ijtimoiy tarmoqlar
                  </p>
                  <PlatformSocialIcons links={socialLinks} />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-[var(--muted)]">
              <Link href="/login" className="hover:text-[var(--brand)]">
                Kirish
              </Link>
              <Link href="/register" className="hover:text-[var(--brand)]">
                Ro&apos;yxatdan o&apos;tish
              </Link>
              <Link href="/c/demo-kafe" className="hover:text-[var(--brand)]">
                Demo
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

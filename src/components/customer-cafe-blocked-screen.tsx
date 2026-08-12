"use client";

import Link from "next/link";
import { Ban, CreditCard, Headphones, Mail, Phone, Send } from "lucide-react";
import { FaInstagram } from "react-icons/fa6";
import { getBlockedScreenCopy } from "@/lib/cafe-public-access";
import type { CustomerBlockVariant } from "@/lib/cafe-suspension";
import type { CafeSuspendReason } from "@prisma/client";
import { useMenuLocale } from "@/hooks/use-menu-locale";
import { CustomerMenuHeader } from "@/components/customer-menu-header";
import type { PublicSupportContacts } from "@/lib/platform-settings";

export function CustomerCafeBlockedScreen({
  slug,
  cafeId,
  cafeName,
  logoUrl,
  menuPrimaryColor,
  variant,
  suspendReason,
  support,
}: {
  slug: string;
  cafeId: string;
  cafeName: string;
  logoUrl?: string | null;
  menuPrimaryColor?: string | null;
  variant: CustomerBlockVariant;
  suspendReason: CafeSuspendReason | null;
  support: PublicSupportContacts;
}) {
  const { locale, setLocale } = useMenuLocale(slug);
  const accent = menuPrimaryColor ?? "#dc2626";
  const copy = getBlockedScreenCopy(variant, suspendReason, locale);
  const activateHref = `/login?next=${encodeURIComponent(`/dashboard/${cafeId}/subscription`)}`;

  const contactItems = [
    support.phone
      ? {
          key: "phone",
          label: support.phone,
          href: `tel:${support.phone.replace(/\s/g, "")}`,
          icon: Phone,
        }
      : null,
    support.telegram
      ? {
          key: "telegram",
          label: "Telegram",
          href: support.telegram,
          icon: Send,
        }
      : null,
    support.instagram
      ? {
          key: "instagram",
          label: "Instagram",
          href: support.instagram,
          icon: FaInstagram,
        }
      : null,
    support.email
      ? {
          key: "email",
          label: support.email,
          href: `mailto:${support.email}`,
          icon: Mail,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    href: string;
    icon: typeof Phone | typeof FaInstagram;
  }>;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-stone-100 via-stone-50 to-white">
      <CustomerMenuHeader
        cafeName={cafeName}
        logoUrl={logoUrl}
        locale={locale}
        onLocaleChange={setLocale}
        menuPrimaryColor={accent}
      />

      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-10 sm:py-14">
        <div className="w-full overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-xl shadow-stone-200/50">
          <div
            className="px-6 py-8 text-center text-white"
            style={{
              background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            }}
          >
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              {variant === "billing" ? (
                <CreditCard className="h-8 w-8" strokeWidth={2} />
              ) : (
                <Ban className="h-8 w-8" strokeWidth={2} />
              )}
            </span>
            <h1 className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">
              {copy.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/90">
              {copy.message}
            </p>
          </div>

          <div className="space-y-5 p-6">
            {variant === "billing" && copy.activateLabel && (
              <Link
                href={activateHref}
                className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
                style={{ backgroundColor: accent }}
              >
                <CreditCard className="h-4 w-4" />
                {copy.activateLabel}
              </Link>
            )}

            <section className="rounded-2xl border border-stone-100 bg-stone-50/80 p-5">
              <div className="flex items-center gap-2 text-stone-800">
                <Headphones className="h-5 w-5" style={{ color: accent }} />
                <h2 className="font-bold">{support.title}</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {copy.supportHint}
              </p>

              {contactItems.length > 0 ? (
                <div className="mt-4 flex flex-col gap-2">
                  {contactItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.key}
                        href={item.href}
                        target={item.key === "phone" || item.key === "email" ? undefined : "_blank"}
                        rel={item.key === "phone" || item.key === "email" ? undefined : "noopener noreferrer"}
                        className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-stone-50"
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                          style={{ backgroundColor: accent }}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-sm text-stone-500">
                  Qo&apos;llab-quvvatlash kontaktlari tez orada qo&apos;shiladi.
                </p>
              )}
            </section>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">
          {cafeName} · {variant === "admin" ? "Administrator blok" : "Obuna blok"}
        </p>
      </main>
    </div>
  );
}

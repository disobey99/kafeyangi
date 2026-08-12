"use client";

import Link from "next/link";
import { Ban, Coffee, CreditCard, Headphones, Mail, Phone, Send } from "lucide-react";
import { FaInstagram } from "react-icons/fa6";
import { LogoutButton } from "@/components/logout-button";
import { getBlockedScreenCopy } from "@/lib/cafe-public-access";
import type { CustomerBlockVariant } from "@/lib/cafe-suspension";
import type { CafeSuspendReason } from "@prisma/client";
import type { PublicSupportContacts } from "@/lib/platform-settings";

export function DashboardCafeBlockedScreen({
  cafeId,
  cafeName,
  variant,
  suspendReason,
  support,
  userName,
}: {
  cafeId: string;
  cafeName: string;
  variant: CustomerBlockVariant;
  suspendReason: CafeSuspendReason | null;
  support: PublicSupportContacts;
  userName: string;
}) {
  const copy = getBlockedScreenCopy(variant, suspendReason, "uz");
  const subscriptionHref = `/dashboard/${cafeId}/subscription`;

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
    <div className="dashboard-panel flex min-h-screen flex-col bg-[var(--dp-bg)]" data-dp-theme="CLASSIC">
      <header
        className="flex items-center justify-between border-b px-4 py-3 sm:px-6"
        style={{ borderColor: "var(--dp-border-subtle)", background: "var(--dp-card)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm">
            <Coffee className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--dp-text)]">{cafeName}</p>
            <p className="truncate text-xs text-[var(--dp-muted)]">{userName}</p>
          </div>
        </div>
        <LogoutButton />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--dp-border)] bg-[var(--dp-card)] shadow-xl">
          <div className="bg-gradient-to-br from-red-600 to-red-500 px-6 py-8 text-center text-white">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              {variant === "billing" ? (
                <CreditCard className="h-8 w-8" strokeWidth={2} />
              ) : (
                <Ban className="h-8 w-8" strokeWidth={2} />
              )}
            </span>
            <h1 className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">{copy.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/90">{copy.message}</p>
          </div>

          <div className="space-y-5 p-6">
            {variant === "billing" && copy.activateLabel && (
              <Link
                href={subscriptionHref}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
              >
                <CreditCard className="h-4 w-4" />
                {copy.activateLabel}
              </Link>
            )}

            <section
              className="rounded-2xl border p-5"
              style={{
                borderColor: "var(--dp-border-subtle)",
                background: "var(--dp-input-bg)",
              }}
            >
              <div className="flex items-center gap-2 text-[var(--dp-text)]">
                <Headphones className="h-5 w-5 text-[var(--dp-accent)]" />
                <h2 className="font-bold">{support.title}</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--dp-muted)]">
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
                        target={
                          item.key === "phone" || item.key === "email" ? undefined : "_blank"
                        }
                        rel={
                          item.key === "phone" || item.key === "email"
                            ? undefined
                            : "noopener noreferrer"
                        }
                        className="flex items-center gap-3 rounded-xl border border-[var(--dp-border)] bg-[var(--dp-card)] px-4 py-3 text-sm font-semibold text-[var(--dp-text)] transition hover:border-[var(--dp-accent)]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--dp-muted)]">
                  Qo&apos;llab-quvvatlash kontaktlari tez orada qo&apos;shiladi.
                </p>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export function DashboardSubscriptionOnlyShell({
  cafeName,
  userName,
  children,
}: {
  cafeName: string;
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-panel flex min-h-screen flex-col bg-[var(--dp-bg)]" data-dp-theme="CLASSIC">
      <header
        className="flex items-center justify-between border-b px-4 py-3 sm:px-6"
        style={{ borderColor: "var(--dp-border-subtle)", background: "var(--dp-card)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm">
            <Coffee className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--dp-text)]">{cafeName}</p>
            <p className="truncate text-xs text-[var(--dp-muted)]">
              Obunani faollashtirish · {userName}
            </p>
          </div>
        </div>
        <LogoutButton />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
